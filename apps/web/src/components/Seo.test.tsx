// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import Seo from './Seo'

function Navigation() {
  const navigate = useNavigate()
  return <button onClick={() => navigate('/groups/private-group')}>Open group</button>
}

afterEach(() => {
  cleanup()
  document.head.querySelectorAll('meta[name="description"], meta[name="robots"], meta[property^="og:"], link[rel="canonical"]').forEach(tag => tag.remove())
})

it('updates public metadata and removes the canonical when entering a private group', async () => {
  const view = render(<MemoryRouter initialEntries={['/home']}><Seo /><Navigation /></MemoryRouter>)
  await waitFor(() => expect(document.title).toBe('GEM — Group Event Manager'))
  expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://gem.aidanlenahan.com/home')
  view.getByRole('button').click()
  await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow'))
  expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  expect(document.head.querySelector('meta[property="og:url"]')).toBeNull()
})

it('canonicalizes query variants to the public page and updates an existing description', () => {
  const meta = document.createElement('meta')
  meta.name = 'description'
  meta.content = 'Old description'
  document.head.appendChild(meta)
  render(<MemoryRouter initialEntries={['/help?contact=1']}><Seo /></MemoryRouter>)
  expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
  expect(meta.content).toContain('Learn how')
  expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://gem.aidanlenahan.com/help')
})
