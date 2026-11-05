import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const pages: Record<string, [string, string]> = {
  '/help/getting-started': ['Getting started with GEM | GEM', 'GEM help guide: Getting started with GEM. Learn how to use the Group Event Manager.'],
  '/help/create-event': ['Create and manage events | GEM', 'GEM help guide: Create and manage events. Learn how to use the Group Event Manager.'],
  '/help/chat': ['Chat with your friends | GEM', 'GEM help guide: Chat with your friends. Learn how to use the Group Event Manager.'],
  '/help/get-help': ['Getting help and contacting support | GEM', 'GEM help guide: Getting help and contacting support. Learn how to use the Group Event Manager.'],
  '/help/install': ['Install GEM on your phone | GEM', 'GEM help guide: Install GEM on your phone. Learn how to use the Group Event Manager.'],
  '/help/calendar': ['Subscribe your calendar to a group | GEM', 'GEM help guide: Subscribe your calendar to a group. Learn how to use the Group Event Manager.'],
  '/help/photos': ['Upload and manage photos | GEM', 'GEM help guide: Upload and manage photos. Learn how to use the Group Event Manager.'],
  '/help/channels': ['Using channels | GEM', 'GEM help guide: Using channels. Learn how to use the Group Event Manager.'],
  '/help/roles': ['Group roles and permissions | GEM', 'GEM help guide: Group roles and permissions. Learn how to use the Group Event Manager.'],
  '/help/notifications': ['Enable push notifications | GEM', 'GEM help guide: Enable push notifications. Learn how to use the Group Event Manager.'],

  '/home': ['GEM — Group Event Manager', 'Plan events, chat, and share photos with your friend groups in GEM, the Group Event Manager.'],
  '/help': ['Help | GEM', 'Learn how to create groups, plan events, chat, and share photos with GEM.'],
  '/contact': ['Contact | GEM', 'Get in touch with the GEM team for help with the Group Event Manager.'],
  '/updates': ['Updates | GEM', 'Explore the latest GEM features and updates for planning events with your friends.'],
  '/privacy': ['Privacy Policy | GEM', 'Read how GEM handles your account information, group content, and privacy.'],
  '/terms': ['Terms of Service | GEM', 'Read the terms for using GEM, the Group Event Manager.'],
}

export default function Seo() {
  const { pathname } = useLocation()
  useEffect(() => {
    const path = pathname === '/' ? '/home' : pathname
    const page = pages[path]
    const indexable = Boolean(page)
    const title = page?.[0] ?? 'GEM — Group Event Manager'
    const description = page?.[1] ?? 'Learn how to use GEM to plan events, chat, and share photos with your friend groups.'
    const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute(attribute, key)
        document.head.appendChild(tag)
      }
      tag.content = content
    }
    document.title = title
    setMeta('name', 'description', description)
    setMeta('name', 'robots', indexable ? 'index, follow' : 'noindex, follow')
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (indexable) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.appendChild(canonical)
      }
      canonical.href = `https://gem.aidanlenahan.com${path}`
      setMeta('property', 'og:url', canonical.href)
    } else {
      canonical?.remove()
      document.head.querySelector('meta[property="og:url"]')?.remove()
    }
  }, [pathname])
  return null
}
