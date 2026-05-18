import { useState } from 'react'
import { Link } from 'react-router-dom'

const articles = [
  {
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
    title: 'Enable push notifications',
    body: (
      <>
        <p>Push notifications let GEM alert you to new events and messages even when the app is closed. They require GEM to be installed as a PWA.</p>
        <ol className="list-decimal list-inside space-y-1 mt-3">
          <li>Install GEM on your home screen (see <em>Install GEM on your phone</em> above).</li>
          <li>Open Settings → Notifications.</li>
          <li>Tap <strong>Enable push notifications</strong> and allow the permission prompt.</li>
          <li>Use the toggles to choose which notification types you want (events, messages, group activity).</li>
        </ol>
        <p className="mt-3 text-gray-500 text-xs">If you don't see the enable button, your browser may have previously blocked the permission. Reset it in your browser's site settings and try again.</p>
      </>
    ),
  },
]

const faqs = [
  {
    question: 'What is GEM?',
    answer:
      'GEM is a private social app for friend groups. You can create groups, plan events, chat in channels, and share photos — all in one place, just for the people you actually hang out with.',
  },
  {
    question: 'How do I sign up?',
    answer:
      "GEM is currently in beta. You'll need an invite code to create an account. If you have one, head to the sign up page. If not, reach out via the Contact page and we'll get you in.",
  },
  {
    question: 'Where do I get an invite code?',
    answer:
      "Invite codes are currently distributed by the GEM team during the beta period. You can request one through the Contact page or get one from a friend who's already on GEM.",
  },
  {
    question: 'Is GEM free?',
    answer:
      "Yes — GEM is completely free during the beta. We'll share any future pricing plans well in advance.",
  },
  {
    question: 'Can I use GEM on my phone?',
    answer:
      'Yes. GEM is a Progressive Web App (PWA). Open it in your mobile browser, then use the "Add to Home Screen" option to install it like a native app. It works on iOS and Android.',
  },
  {
    question: 'How many people can be in a group?',
    answer:
      "Groups are designed for close friend circles. There's no hard cap, but GEM is optimized for small, trusted groups — not public communities.",
  },
  {
    question: 'Who can see my content?',
    answer:
      'Only members of your group can see the content inside it. GEM is private by design — there are no public profiles, no discovery feeds, and no ads.',
  },
  {
    question: 'How do I report a bug or problem?',
    answer:
      "Use the Contact page to report any issues. During beta, we're especially interested in feedback, so don't hesitate to reach out.",
  },
]

function ArticleAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i)

  return (
    <div className="space-y-2">
      {articles.map((article, i) => (
        <div
          key={i}
          className={`rounded-xl border transition-colors ${
            openIndex === i
              ? 'border-indigo-800/50 bg-indigo-950/30'
              : 'border-gray-800 bg-gray-900'
          }`}
        >
          <button
            onClick={() => toggle(i)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <span className="text-sm font-medium text-gray-100">{article.title}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${openIndex === i ? 'rotate-180 text-indigo-400' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIndex === i && (
            <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed space-y-1">
              {article.body}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i)

  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className={`rounded-xl border transition-colors ${
            openIndex === i
              ? 'border-indigo-800/50 bg-indigo-950/30'
              : 'border-gray-800 bg-gray-900'
          }`}
        >
          <button
            onClick={() => toggle(i)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <span className="text-sm font-medium text-gray-100">{faq.question}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${openIndex === i ? 'rotate-180 text-indigo-400' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIndex === i && (
            <div className="px-5 pb-4">
              <p className="text-sm text-gray-400 leading-relaxed">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-100">
          Help
        </h1>
        <p className="mt-3 text-gray-400">
          Can't find what you're looking for?{' '}
          <Link to="/contact" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Reach out to us.
          </Link>
        </p>
      </div>

      <section className="mb-12">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">How-to guides</h2>
        <ArticleAccordion />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Frequently asked questions</h2>
        <FaqAccordion />
      </section>
    </div>
  )
}
