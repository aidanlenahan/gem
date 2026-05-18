import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getArticle } from '../lib/helpArticles'

interface HelpButtonProps {
  slug: string
  className?: string
}

export default function HelpButton({ slug, className = '' }: HelpButtonProps) {
  const [open, setOpen] = useState(false)
  const article = getArticle(slug)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  if (!article) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Help: ${article.title}`}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`}
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-800 overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-100 leading-snug">{article.title}</h2>
              <button
                onClick={() => setOpen(false)}
                className="shrink-0 text-gray-600 hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-gray-400 leading-relaxed space-y-1 max-h-[60vh] overflow-y-auto">
              {article.body}
            </div>
            <div className="px-5 py-3 border-t border-gray-800">
              <Link
                to={`/help/${slug}`}
                onClick={() => setOpen(false)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Open full guide →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
