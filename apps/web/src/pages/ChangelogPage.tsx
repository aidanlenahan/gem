import { Link } from 'react-router-dom'

type ChangeType = 'new' | 'improved' | 'fixed'

interface ChangeEntry {
  type: ChangeType
  text: string
}

interface Release {
  version: string
  date: string
  label?: string
  summary: string
  changes: ChangeEntry[]
}

const releases: Release[] = [
  {
    version: '0.7',
    date: 'May 2026',
    label: 'Beta',
    summary: 'EXIF metadata on photos, a group-wide Photos tab, and this very changelog.',
    changes: [
      { type: 'new', text: 'Photo info panel now shows verbose EXIF metadata — camera make/model, lens, focal length, aperture, shutter speed, ISO, GPS coordinates, and date taken (when available)' },
      { type: 'new', text: 'Image dimensions (width × height) stored and displayed for every uploaded photo' },
      { type: 'new', text: 'Photos tab on the Group page — browse every photo uploaded across all events in a group, sorted newest-first, in a touch-friendly grid' },
      { type: 'new', text: 'Clicking any photo in the group Photos tab opens the full lightbox with EXIF info, download, and swipe navigation' },
      { type: 'new', text: 'This changelog page — a full history of GEM features, accessible from the sidebar and public site' },
      { type: 'improved', text: 'GEM favicon now appears in the desktop sidebar next to the app name' },
      { type: 'improved', text: 'Profile picture in the sidebar is now a direct link to your profile page on desktop' },
    ],
  },
  {
    version: '0.6',
    date: 'May 2026',
    label: 'Beta',
    summary: 'Media uploads in events, message replies, and per-user calendar tuning.',
    changes: [
      { type: 'new', text: 'Upload photos to any event — images stored on the server with per-group storage quotas (default 100 MB, up to 1 GB)' },
      { type: 'new', text: 'Full-screen lightbox for viewing event photos — swipe or arrow-key navigation, download button, info panel' },
      { type: 'new', text: 'Group admins get a dedicated Media tab in group management: view all uploads, see storage usage, delete any photo, toggle upload permissions, and adjust the storage cap' },
      { type: 'new', text: 'Global media toggle in the Developer panel — enable/disable uploads server-wide, optionally require an unlock code that group admins must enter' },
      { type: 'new', text: 'Reply to any channel message — replies show an inline quoted preview of the original' },
      { type: 'new', text: 'Per-user calendar preferences: choose whether untagged events appear in your ICS feed' },
      { type: 'new', text: 'Channel tags — tag channels within a group for better organisation' },
      { type: 'improved', text: 'Audit log in group management now exports to CSV' },
      { type: 'improved', text: 'Invite-only channels now auto-add the creator as a subscriber' },
      { type: 'fixed', text: 'Hover dropdown on public pages (Help, Contact) no longer lingers 200 ms after moving the cursor away' },
    ],
  },
  {
    version: '0.5',
    date: 'May 2026',
    label: 'Beta',
    summary: 'Full-featured channel chat with reactions, pins, message management, and unread tracking.',
    changes: [
      { type: 'new', text: 'Real-time channel messaging over a shared WebSocket connection — messages appear instantly for every member in the channel' },
      { type: 'new', text: 'Emoji reactions on any channel message, with live count updates across all clients' },
      { type: 'new', text: 'Pin messages in a channel — pinned messages appear in a collapsible banner at the top of the chat' },
      { type: 'new', text: 'Edit your own messages; an "edited" indicator is shown' },
      { type: 'new', text: 'Delete your own messages (admins can delete anyone\'s)' },
      { type: 'new', text: 'Typing indicators — see who is currently composing a message' },
      { type: 'new', text: 'Optimistic message sending — your message appears instantly before the server confirms it' },
      { type: 'new', text: 'Unread dot on channel list items — the server tracks your last-read position' },
      { type: 'new', text: 'Private events now display a lock glyph and a full list of invited members' },
      { type: 'new', text: 'Invite-only channels show a lock glyph consistent with private events' },
      { type: 'improved', text: 'Auto-scroll only triggers when you are already at the bottom; a "Jump to bottom" button appears when you scroll up' },
      { type: 'improved', text: 'Consecutive messages from the same user are visually grouped (Discord-style), reducing clutter' },
      { type: 'improved', text: 'Mobile keyboard no longer disrupts scroll position or triggers unwanted page zoom in channel view' },
      { type: 'improved', text: 'Mobile channel drawer — hamburger opens a full channel list slide-in panel without navigating away' },
      { type: 'fixed', text: 'Socket connection is now a shared singleton per session — no more duplicate connections on remount' },
      { type: 'fixed', text: 'Reconnect banner appears when the socket drops; live updates resume automatically on reconnect' },
      { type: 'fixed', text: 'Rate-limit errors from the server are now surfaced in the chat UI instead of silently failing' },
    ],
  },
  {
    version: '0.4',
    date: 'April–May 2026',
    label: 'Beta',
    summary: 'Notifications inbox, push delivery, security hardening, and the public-facing website.',
    changes: [
      { type: 'new', text: 'Full notifications inbox: filter by type (events, messages, group activity), search, and batch mark-as-read' },
      { type: 'new', text: 'Push notifications for PWA installs — get alerted to new events and messages even when the app is closed' },
      { type: 'new', text: 'In-app notification channel — alerts appear inside the app without a full page reload' },
      { type: 'new', text: 'PWA install prompt for iOS and Android with automatic platform detection and step-by-step instructions' },
      { type: 'new', text: 'Per-type notification preferences (push, email) in Settings — toggle each event type independently' },
      { type: 'new', text: 'Public-facing website: Landing page, Help (FAQ), and Contact pages — accessible without logging in' },
      { type: 'new', text: 'Notification bell in the desktop sidebar header; badge shows unread count' },
      { type: 'improved', text: 'Security hardening: strict CORS policy, Content-Security-Policy headers, metrics endpoint protected, session tokens no longer persisted insecurely' },
      { type: 'improved', text: 'Rate limits applied to all mutation endpoints (auth, group creation, event creation, RSVP, reactions, subscriptions)' },
      { type: 'improved', text: 'Error states with retry buttons on all data-loading pages' },
    ],
  },
  {
    version: '0.3',
    date: 'April 2026',
    label: 'Beta',
    summary: 'Event editing, group management tools, navigation polish, and per-user settings.',
    changes: [
      { type: 'new', text: 'Edit events after creation — update title, date/time, duration, location, description, RSVP cap, private toggle, and tags' },
      { type: 'new', text: 'Duration picker with 30 min / 1 hr / 2 hr / 3 hr presets; custom hour + minute inputs; per-user saved presets (up to 5)' },
      { type: 'new', text: 'Color-coded event tags — create and manage tags per group, apply up to 3 per event, filter events by tag' },
      { type: 'new', text: 'Group management page: full member list, role management, invite link controls, pending member approvals, and audit log' },
      { type: 'new', text: 'Audit log in group management records all admin actions (role changes, removals, invite resets) with timestamps' },
      { type: 'new', text: 'Per-user mute — silence notifications from a specific other user across all groups' },
      { type: 'new', text: 'ICS calendar feed — subscribe to a group\'s upcoming events in Apple Calendar, Outlook, or Google Calendar via a personal token URL' },
      { type: 'new', text: 'Event rating — members can rate events (1–5) after they end; the average appears on the event page' },
      { type: 'new', text: 'User profile pages at /u/:username — view another member\'s name, bio, and avatar' },
      { type: 'improved', text: 'PageToolbar: every page now has consistent back and reload buttons in the top-right corner' },
      { type: 'improved', text: 'Group page tabs (Events, Members, Channels) are scrollable on narrow screens' },
      { type: 'improved', text: 'Admin controls for event deletion and member removal visible directly on the group page' },
    ],
  },
  {
    version: '0.2',
    date: 'April 2026',
    label: 'Beta',
    summary: 'Email auth flows, dark mode, group invites, group roles, user profiles, and event reactions.',
    changes: [
      { type: 'new', text: 'Email-based registration with 6-digit OTP verification — invite code required during beta' },
      { type: 'new', text: 'Forgot password and reset-password flows — secure token-based, 1-hour expiry' },
      { type: 'new', text: 'SMTP email delivery via nodemailer — verification codes and password resets sent from your own mail server' },
      { type: 'new', text: 'Dark mode as the default theme, with a light mode option in Settings' },
      { type: 'new', text: 'Group invite system — admins generate a shareable invite link; new members join the group on first visit' },
      { type: 'new', text: 'Group roles: owner, admin, and member — admins can promote or demote members; role badges shown on profile and member list' },
      { type: 'new', text: 'Username field — unique, human-readable handle changeable once per year; displayed throughout the app' },
      { type: 'new', text: 'Profile photo upload — set an avatar from Settings; displayed in the sidebar, member list, and chat' },
      { type: 'new', text: 'Emoji reactions on event messages — pick from a reaction panel, see live grouped counts, toggle your own reaction off' },
      { type: 'new', text: 'Beta code system — separate codes for account registration and group creation; admin can issue codes' },
      { type: 'new', text: 'Mobile-first layout: sidebar slides in via hamburger on small screens; overlay backdrop closes it on tap' },
      { type: 'new', text: 'ARIA labels and accessibility improvements across all pages and navigation' },
      { type: 'improved', text: 'Network-aware UX via useIsOnline hook — offline state shown as a banner; retries deferred until reconnection' },
    ],
  },
  {
    version: '0.1',
    date: 'April 2026',
    label: 'Beta launch',
    summary: 'Initial private beta — the full foundation: groups, events, channels, and the PWA shell.',
    changes: [
      { type: 'new', text: 'Create and manage friend groups — name, description, and member list' },
      { type: 'new', text: 'Plan events with title, date/time, location, description, optional RSVP cap, and private-event flag' },
      { type: 'new', text: 'RSVP to events (Going / Maybe / Not going) with live attendance counts' },
      { type: 'new', text: 'Invite specific members to private events — non-invited members cannot see them' },
      { type: 'new', text: 'Create named channels within a group; open (anyone can join) or invite-only' },
      { type: 'new', text: 'Real-time channel chat powered by Socket.IO with a BullMQ notification worker for fanout' },
      { type: 'new', text: 'Per-channel subscription — join channels you care about; leave ones you don\'t' },
      { type: 'new', text: 'User profiles with display name, bio, and avatar (initials fallback)' },
      { type: 'new', text: 'ICS calendar feed — personal URL that exports your group events to any calendar app' },
      { type: 'new', text: 'Progressive Web App — installable from the browser on iOS and Android; Workbox offline caching' },
      { type: 'new', text: 'Push notification infrastructure — service worker, VAPID keys, subscription upsert endpoint' },
      { type: 'new', text: 'Notification preference system — opt in/out per event type (events, RSVPs, messages) and per channel (push, email)' },
      { type: 'new', text: 'Developer panel for admin users — health checks, Redis and DB status, notification test tools' },
      { type: 'new', text: 'Integration test suite covering auth, events, RSVPs, notifications, and calendar output' },
    ],
  },
]

const badgeStyles: Record<ChangeType, string> = {
  new: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60',
  improved: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
  fixed: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
}

const badgeLabel: Record<ChangeType, string> = {
  new: 'New',
  improved: 'Improved',
  fixed: 'Fixed',
}

export default function ChangelogPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-100">
          Changelog
        </h1>
        <p className="mt-3 text-gray-400">
          What's new in GEM.{' '}
          <Link to="/contact" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Have feedback?
          </Link>
        </p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-800" aria-hidden="true" />

        <div className="space-y-12">
          {releases.map((release) => (
            <div key={release.version} className="relative pl-8">
              {/* Timeline dot */}
              <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-gray-950 shrink-0" aria-hidden="true" />

              {/* Header */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-lg font-bold text-gray-100">v{release.version}</span>
                {release.label && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
                    {release.label}
                  </span>
                )}
                <span className="text-sm text-gray-500 ml-auto">{release.date}</span>
              </div>

              <p className="text-sm text-gray-400 mb-4">{release.summary}</p>

              {/* Change list */}
              <ul className="space-y-2">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <span
                      className={`shrink-0 mt-0.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${badgeStyles[change.type]}`}
                    >
                      {badgeLabel[change.type]}
                    </span>
                    <span className="leading-relaxed">{change.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
