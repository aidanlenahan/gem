import type { ReactNode } from 'react'

export interface HelpArticle {
  slug: string
  title: string
  body: ReactNode
}

export const helpArticles: HelpArticle[] = [
  {
    slug: 'install',
    title: 'Install GEM on your phone',
    body: (
      <>
        <p>GEM is a Progressive Web App (PWA) — no app store required.</p>
        <p className="font-medium text-gray-200 mt-3">On iPhone (Safari)</p>
        <ol className="list-decimal list-inside space-y-1 mt-1">
          <li>Open GEM in Safari.</li>
          <li>Tap the Share button (the box with an arrow).</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong>. GEM now appears on your home screen like a native app.</li>
        </ol>
        <p className="font-medium text-gray-200 mt-3">On Android (Chrome)</p>
        <ol className="list-decimal list-inside space-y-1 mt-1">
          <li>Open GEM in Chrome.</li>
          <li>Tap the three-dot menu (⋮) in the top right.</li>
          <li>Tap <strong>Add to Home screen</strong>, then <strong>Add</strong>.</li>
        </ol>
        <p className="mt-3 text-gray-500 text-xs">Once installed, GEM can send you push notifications for new events and messages even when the app is closed.</p>
      </>
    ),
  },
  {
    slug: 'calendar',
    title: 'Subscribe your calendar to a group',
    body: (
      <>
        <p>GEM generates a personal ICS feed for each group. Paste it into any calendar app to see upcoming events alongside your own schedule — and it updates automatically.</p>
        <ol className="list-decimal list-inside space-y-1 mt-3">
          <li>Open the group page and go to the <strong>Events</strong> tab.</li>
          <li>Tap the calendar icon near the top of the tab.</li>
          <li>Copy your personal ICS URL.</li>
          <li>In your calendar app, choose <strong>Add calendar by URL</strong> (Apple Calendar, Google Calendar, and Outlook all support this) and paste the URL.</li>
        </ol>
        <p className="mt-3 text-gray-500 text-xs">Your ICS URL is personal — it includes a private token. Don't share it publicly. You can regenerate it from Settings if needed.</p>
      </>
    ),
  },
  {
    slug: 'photos',
    title: 'Upload and manage photos',
    body: (
      <>
        <p>You can attach photos to any event your group has created.</p>
        <ol className="list-decimal list-inside space-y-1 mt-3">
          <li>Open an event page.</li>
          <li>Scroll to the <strong>Photos</strong> section and tap the upload button.</li>
          <li>Select one or more images from your device.</li>
          <li>Tap a photo to open the lightbox — from there you can add a caption, download the original, or view EXIF metadata.</li>
        </ol>
        <p className="font-medium text-gray-200 mt-3">Albums</p>
        <p className="mt-1">Group admins can create named albums from the <strong>Photos</strong> tab on the group page. Any photo can be added to one or more albums.</p>
        <p className="mt-3 text-gray-500 text-xs">Each group has a storage quota set by the admin (default 100 MB, up to 1 GB). Storage usage is visible in Group Management → Media.</p>
      </>
    ),
  },
  {
    slug: 'channels',
    title: 'Using channels',
    body: (
      <>
        <p>Channels are persistent group chats that live alongside events. Each group can have multiple channels for different topics.</p>
        <p className="font-medium text-gray-200 mt-3">Joining a channel</p>
        <p className="mt-1">Open the group page, go to the <strong>Channels</strong> tab, and tap <strong>Join</strong> next to any open channel. Invite-only channels require an admin to add you.</p>
        <p className="font-medium text-gray-200 mt-3">Key features</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Emoji reactions on any message</li>
          <li>Reply to a specific message with an inline quote</li>
          <li>Pin important messages — they appear at the top of the chat</li>
          <li>Edit or delete your own messages</li>
          <li>Unread dot on channels with new messages since your last visit</li>
        </ul>
        <p className="mt-3 text-gray-500 text-xs">On mobile, tap the hamburger icon inside the chat to slide open the full channel list without leaving the conversation.</p>
      </>
    ),
  },
  {
    slug: 'roles',
    title: 'Group roles and permissions',
    body: (
      <>
        <p>Every group has three roles: <strong>Owner</strong>, <strong>Admin</strong>, and <strong>Member</strong>.</p>
        <ul className="list-disc list-inside space-y-1 mt-3">
          <li><strong>Owner</strong> — the person who created the group. Full control, cannot be removed by admins.</li>
          <li><strong>Admin</strong> — can invite and remove members, promote other members to admin, manage events, delete photos, create albums, and adjust group settings.</li>
          <li><strong>Member</strong> — can create events, RSVP, upload photos, send messages, and join open channels.</li>
        </ul>
        <p className="font-medium text-gray-200 mt-3">Promoting a member</p>
        <p className="mt-1">Go to the group page → Members tab, tap the action button (⋯) next to a member, and choose <strong>Promote to admin</strong>.</p>
      </>
    ),
  },
  {
    slug: 'notifications',
    title: 'Enable push notifications',
    body: (
      <>
        <p>Push notifications let GEM alert you to new events and messages even when the app is closed. They require GEM to be installed as a PWA.</p>
        <ol className="list-decimal list-inside space-y-1 mt-3">
          <li>Install GEM on your home screen (see <em>Install GEM on your phone</em>).</li>
          <li>Open Settings → Notifications.</li>
          <li>Tap <strong>Enable push notifications</strong> and allow the permission prompt.</li>
          <li>Use the toggles to choose which notification types you want (events, messages, group activity).</li>
        </ol>
        <p className="mt-3 text-gray-500 text-xs">If you don't see the enable button, your browser may have previously blocked the permission. Reset it in your browser's site settings and try again.</p>
      </>
    ),
  },
]

export function getArticle(slug: string): HelpArticle | undefined {
  return helpArticles.find((a) => a.slug === slug)
}
