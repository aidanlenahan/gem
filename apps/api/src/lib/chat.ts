import { createHmac } from "crypto";
import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import type { PrismaClient } from "../generated/prisma/index.js";
import type { FastifyBaseLogger } from "fastify";

// ---------------------------------------------------------------------------
// JWT helpers for Socket.IO (not inside Fastify request lifecycle)
// ---------------------------------------------------------------------------

function verifyHS256JWT(token: string, secret: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  if (expected !== signature) throw new Error("Invalid signature");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as Record<string, unknown>;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (typeof decoded.exp === "number" && nowSeconds >= decoded.exp) {
    throw new Error("Token expired");
  }

  if (typeof decoded.nbf === "number" && nowSeconds < decoded.nbf) {
    throw new Error("Token not active");
  }

  return decoded;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SocketUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
}

interface AuthedSocket extends Socket {
  data: {
    userId: string;
    user: SocketUser;
  };
}

// ---------------------------------------------------------------------------
// Tiered sliding-window rate limiting
//   Tier 1:  3 messages /  10 s  — burst guard
//   Tier 2: 10 messages /  30 s  — sustained chat guard
//   Tier 3: 20 messages /  60 s  — per-minute hard cap
// ---------------------------------------------------------------------------

const RATE_TIERS = [
  { windowMs: 10_000, limit: 3 },
  { windowMs: 30_000, limit: 10 },
  { windowMs: 60_000, limit: 20 },
] as const;

const MAX_WINDOW_MS = Math.max(...RATE_TIERS.map((t) => t.windowMs));

const userMessageTimestamps = new Map<string, number[]>();

function consumeChatQuota(userId: string): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const timestamps = userMessageTimestamps.get(userId) ?? [];

  // Drop timestamps outside the widest window to keep memory bounded.
  const fresh = timestamps.filter((t) => now - t < MAX_WINDOW_MS);

  for (const { windowMs, limit } of RATE_TIERS) {
    const inWindow = fresh.filter((t) => now - t < windowMs);
    if (inWindow.length >= limit) {
      // Cooldown ends when the oldest timestamp in this window ages out.
      const oldest = Math.min(...inWindow);
      const retryAfterMs = oldest + windowMs - now;
      return {
        limited: true,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }
  }

  fresh.push(now);
  userMessageTimestamps.set(userId, fresh);
  return { limited: false, retryAfterSeconds: 0 };
}

// ---------------------------------------------------------------------------
// Chat server factory
// ---------------------------------------------------------------------------

export function createChatServer(
  httpServer: HTTPServer,
  prisma: PrismaClient,
  jwtSecret: string,
  corsOrigin: string | string[],
  logger: FastifyBaseLogger,
  onChannelMessageCreated?: (payload: {
    messageId: string;
    channelId: string;
    groupId: string;
    userId: string;
    name: string;
    username: string | null;
    content: string;
  }) => Promise<void>
): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  // ---- Auth middleware -------------------------------------------------
  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token ?? "") as string;
      if (!token) return next(new Error("Authentication required"));

      const payload = verifyHS256JWT(token, jwtSecret);
      const userId = payload.sub as string;
      if (!userId) return next(new Error("Invalid token payload"));

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, username: true },
      });
      if (!user) return next(new Error("User not found"));

      socket.data.userId = userId;
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  // ---- Connection handler ---------------------------------------------
  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AuthedSocket;
    const { user } = socket.data;
    logger.info({ userId: user.id, socketId: socket.id }, "Socket connected");

    // -- join:channel ---------------------------------------------------
    socket.on("join:channel", async (data: unknown) => {
      if (
        typeof data !== "object" ||
        data === null ||
        typeof (data as Record<string, unknown>).channelId !== "string" ||
        typeof (data as Record<string, unknown>).groupId !== "string"
      ) {
        socket.emit("error", { code: "BAD_REQUEST", message: "channelId and groupId must be strings" });
        return;
      }
      const { channelId, groupId } = data as { channelId: string; groupId: string };
      try {
        const membership = await prisma.membership.findUnique({
          where: { userId_groupId: { userId: user.id, groupId } },
        });
        if (!membership || membership.status !== "active") {
          socket.emit("error", { code: "FORBIDDEN", message: "Not an active group member" });
          return;
        }
        const channel = await prisma.channel.findFirst({
          where: { id: channelId, groupId },
        });
        if (!channel) {
          socket.emit("error", { code: "NOT_FOUND", message: "Channel not found" });
          return;
        }

        if (channel.isInviteOnly) {
          const subscription = await prisma.channelSubscription.findUnique({
            where: { userId_channelId: { userId: user.id, channelId } },
          });
          if (!subscription) {
            socket.emit("error", { code: "FORBIDDEN", message: "Not subscribed to this channel" });
            return;
          }
        }

        await socket.join(`channel:${channelId}`);
        socket.emit("joined:channel", { channelId });
        logger.info({ userId: user.id, channelId }, "Joined channel room");
      } catch (err) {
        logger.error(err, "join:channel error");
        socket.emit("error", { code: "INTERNAL", message: "Failed to join channel" });
      }
    });

    // -- leave:channel --------------------------------------------------
    socket.on("leave:channel", (channelId: unknown) => {
      if (typeof channelId !== "string") return;
      socket.leave(`channel:${channelId}`);
      socket.emit("left:channel", { channelId });
    });

    // -- channel:message:send -------------------------------------------
    socket.on("channel:message:send", async (data: unknown) => {
      if (
        typeof data !== "object" ||
        data === null ||
        typeof (data as Record<string, unknown>).channelId !== "string" ||
        typeof (data as Record<string, unknown>).content !== "string"
      ) {
        socket.emit("error", { code: "BAD_REQUEST", message: "Invalid channel message payload" });
        return;
      }
      const raw = data as { channelId: string; content: string; replyToId?: string | null };
      const { channelId, content } = raw;
      const replyToId = typeof raw.replyToId === "string" ? raw.replyToId : null;
      const trimmed = content.trim().slice(0, 2000);
      if (!trimmed) {
        socket.emit("error", { code: "BAD_REQUEST", message: "Message content is empty" });
        return;
      }
      if (!socket.rooms.has(`channel:${channelId}`)) {
        socket.emit("error", { code: "FORBIDDEN", message: "Join the channel room first" });
        return;
      }
      const quota = consumeChatQuota(user.id);
      if (quota.limited) {
        socket.emit("error", {
          code: "RATE_LIMITED",
          message: `Too many messages. Try again in ${quota.retryAfterSeconds}s`,
          retryAfterSeconds: quota.retryAfterSeconds,
        });
        return;
      }
      try {
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          select: { id: true, groupId: true },
        });
        if (!channel) {
          socket.emit("error", { code: "NOT_FOUND", message: "Channel not found" });
          return;
        }
        // Check mute status
        const muteMembership = await prisma.membership.findUnique({
          where: { userId_groupId: { userId: user.id, groupId: channel.groupId } },
          select: { mutedUntil: true },
        });
        if (muteMembership?.mutedUntil && muteMembership.mutedUntil > new Date()) {
          socket.emit("error", { code: "MUTED", message: "You are muted in this group" });
          return;
        }
        const message = await prisma.message.create({
          data: {
            channelId,
            userId: user.id,
            content: trimmed,
            ...(replyToId ? { replyToId } : {}),
          },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            replyTo: { select: { id: true, content: true, user: { select: { id: true, name: true } } } },
          },
        });
        io.to(`channel:${channelId}`).emit("channel:message:new", message);
        if (onChannelMessageCreated) {
          await onChannelMessageCreated({
            messageId: message.id,
            channelId,
            groupId: channel.groupId,
            userId: user.id,
            name: user.name,
            username: user.username ?? null,
            content: message.content,
          });
        }
      } catch (err) {
        logger.error(err, "channel:message:send error");
        socket.emit("error", { code: "INTERNAL", message: "Failed to persist channel message" });
      }
    });

    // -- channel:typing:start -------------------------------------------
    socket.on("channel:typing:start", (channelId: unknown) => {
      if (typeof channelId !== "string") return;
      if (!socket.rooms.has(`channel:${channelId}`)) return;
      socket.to(`channel:${channelId}`).emit("channel:typing:start", {
        userId: user.id,
        name: user.name,
        channelId,
      });
    });

    // -- channel:typing:stop --------------------------------------------
    socket.on("channel:typing:stop", (channelId: unknown) => {
      if (typeof channelId !== "string") return;
      if (!socket.rooms.has(`channel:${channelId}`)) return;
      socket.to(`channel:${channelId}`).emit("channel:typing:stop", {
        userId: user.id,
        channelId,
      });
    });

    // -- disconnect -----------------------------------------------------
    socket.on("disconnect", () => {
      logger.info({ userId: user.id, socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}
