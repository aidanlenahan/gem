import { Link, useParams, Navigate } from 'react-router-dom'
import { getArticle, helpArticles } from '../lib/helpArticles'

export default function HelpArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? getArticle(slug) : undefined

  if (!article) return <Navigate to="/help" replace />

  const currentIndex = helpArticles.findIndex((a) => a.slug === slug)
  const prev = currentIndex > 0 ? helpArticles[currentIndex - 1] : null
  const next = currentIndex < helpArticles.length - 1 ? helpArticles[currentIndex + 1] : null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <Link
        to="/help"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All guides
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-100 mb-6">
        {article.title}
      </h1>

      <div className="text-sm text-gray-400 leading-relaxed space-y-1">
        {article.body}
      </div>

      {(prev || next) && (
        <div className="mt-12 pt-6 border-t border-gray-800 flex justify-between gap-4">
          {prev ? (
            <Link
              to={`/help/${prev.slug}`}
              className="flex-1 group rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-700 p-4 transition-colors"
            >
              <p className="text-xs text-gray-600 mb-1">Previous</p>
              <p className="text-sm font-medium text-gray-300 group-hover:text-gray-100 transition-colors">{prev.title}</p>
            </Link>
          ) : <div className="flex-1" />}
          {next ? (
            <Link
              to={`/help/${next.slug}`}
              className="flex-1 group rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-700 p-4 transition-colors text-right"
            >
              <p className="text-xs text-gray-600 mb-1">Next</p>
              <p className="text-sm font-medium text-gray-300 group-hover:text-gray-100 transition-colors">{next.title}</p>
            </Link>
          ) : <div className="flex-1" />}
        </div>
      )}
    </div>
  )
}
