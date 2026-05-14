-- CreateTable: ChannelReadState tracks the last time a user read a channel.
-- Uses a composite primary key (userId, channelId) — one row per user per channel.
CREATE TABLE "ChannelReadState" (
    "userId"     TEXT NOT NULL,
    "channelId"  TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelReadState_pkey" PRIMARY KEY ("userId","channelId")
);

-- Foreign keys
ALTER TABLE "ChannelReadState"
    ADD CONSTRAINT "ChannelReadState_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChannelReadState"
    ADD CONSTRAINT "ChannelReadState_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for looking up all read states for a given channel (admin queries)
CREATE INDEX "ChannelReadState_channelId_idx" ON "ChannelReadState"("channelId");
