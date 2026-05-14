# GEM — Group Event Manager

A private app for friend groups to plan events, chat, and share photos — all in one place.

## What GEM does

Most friend groups juggle multiple apps: one for scheduling, one for chat, one for photos. GEM brings it all together in a single installable app, purpose-built for small groups who know each other.

---

### Groups

Create a group for any set of friends. Each group is private and self-contained — events, channels, photos, and members are all scoped to it. Roles (owner, admin, member) give admins the controls they need without overexposing everything.

- **Invite links** — share a 12-character link to let people join; pending join requests can be approved or denied
- **Group management** — edit group details, manage members, promote/demote roles, regenerate the invite link, view an audit log of all admin actions, and export it to CSV
- **Group stats** — admins can view total events, RSVPs, message counts, storage usage, top tags, and most active members

### Events

Plan an event with a title, date and time, location, description, and optional RSVP cap. Tag events so members can filter and subscribe to the content they care about.

- RSVP as Going, Maybe, or Not Going — live attendance counts are shown to all members
- Private events — invite specific members only; non-invited members cannot see the event
- Edit events after creation — update any field, add or change the cover photo or tags
- Rate events (1–5) after they end — the average rating appears on the event page
- Export to calendar — download an `.ics` file or subscribe to a live group feed that syncs to Apple Calendar, Outlook, or Google Calendar

### Channels

Group-level topic channels for async conversation — create as many as you need, open or invite-only.

- **Real-time messaging** via a shared WebSocket connection — messages appear instantly
- Emoji reactions, pinned messages, edit/delete own messages, typing indicators
- Reply to any message with an inline quoted preview
- Unread tracking — the server tracks your last-read position and shows an unread badge
- Channel tags — tag channels for better organisation within a group
- Mobile-friendly channel drawer with a full slide-in channel list

### Photos

Upload photos to any event. Photos are stored on the server with configurable per-group storage quotas.

- Full-screen lightbox — swipe or arrow-key navigation, download, and verbose EXIF info panel (camera, lens, focal length, aperture, shutter, ISO, GPS coordinates, dimensions)
- Group Photos tab — browse every photo uploaded across all events in a grid, sorted newest-first
- Storage management — group admins can view usage, delete photos, toggle upload permissions, and adjust the storage cap up to 1 GB

### Notifications

- **Push notifications** for PWA installs — get alerted to new events, RSVPs, and messages even when the app is closed
- **Email notifications** via SMTP for the same events
- **Per-type preferences** — toggle push and email independently for each notification type
- **Notification inbox** — filter by type, search, and batch mark-as-read

### Profiles and auth

- Email registration with 6-digit OTP verification
- Forgot-password and reset-password flows (secure token, 1-hour expiry)
- Profile photo, display name, and a unique username (changeable once per year)
- Dark and light theme

### PWA

GEM is installable on iOS and Android directly from the browser — no app store needed. Workbox service worker provides offline caching and background push delivery.

### Beta access control

Registration and group creation can be gated behind single-use beta codes, manageable from the Developer panel.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| State / data | TanStack Query, Zustand, React Router |
| Backend | Fastify, TypeScript |
| Realtime | Socket.IO |
| Database | PostgreSQL + Prisma ORM |
| Cache / queues | Redis, BullMQ |
| Email | Nodemailer (SMTP) |
| Push | Web Push (VAPID) |
| PWA | Workbox / vite-plugin-pwa |
