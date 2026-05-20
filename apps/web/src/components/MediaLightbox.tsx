import { useState, useCallback, useEffect, useRef } from 'react'

export interface LightboxMedia {
  id: string
  url: string
  filename: string
  sizeBytes: number
  mimeType: string
  width: number | null
  height: number | null
  exifData: Record<string, unknown> | null
  caption: string | null
  createdAt: string
  uploader: { id: string; name: string; avatarUrl: string | null } | null
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function fmtMime(mime: string): string {
  return { 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WebP' }[mime] ?? mime
}

function fmtExposure(v: number): string {
  return v < 1 ? `1/${Math.round(1 / v)}s` : `${v}s`
}

function fmtGPS(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? 'E' : 'W'}`
}

export function MediaLightbox({
  media,
  initialIndex,
  onClose,
  currentUserId,
  isAdmin,
  onSaveCaption,
  onDelete,
}: {
  media: LightboxMedia[]
  initialIndex: number
  onClose: () => void
  currentUserId?: string
  isAdmin?: boolean
  onSaveCaption?: (assetId: string, caption: string | null) => Promise<void>
  onDelete?: (assetId: string) => Promise<void>
}) {
  const [index, setIndex] = useState(initialIndex)
  const [showInfo, setShowInfo] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState('')
  const [savingCaption, setSavingCaption] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const total = media.length
  const current = media[index]
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const prev = useCallback(() => { setIndex((i) => (i - 1 + total) % total); setShowInfo(false); setEditingCaption(false); setConfirmDelete(false) }, [total])
  const next = useCallback(() => { setIndex((i) => (i + 1) % total); setShowInfo(false); setEditingCaption(false); setConfirmDelete(false) }, [total])

  const canEditCaption = !!(onSaveCaption && (isAdmin || currentUserId === current?.uploader?.id))

  const handleSaveCaption = async () => {
    if (!onSaveCaption) return
    setSavingCaption(true)
    try {
      await onSaveCaption(current.id, captionDraft.trim() || null)
      setEditingCaption(false)
    } finally {
      setSavingCaption(false)
    }
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || total <= 1) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next(); else prev()
    }
  }, [total, prev, next])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (showInfo) setShowInfo(false); else onClose() }
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next, showInfo])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete(current.id)
      onClose()
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(current.url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = current.filename
      a.click()
      URL.revokeObjectURL(blobUrl)
    } finally {
      setDownloading(false)
    }
  }

  const uploadedAt = new Date(current.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const takenAt = (() => {
    const raw = current.exifData?.DateTimeOriginal ?? current.exifData?.CreateDate
    if (!raw) return null
    try { return new Date(raw as string).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }
    catch { return null }
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={() => { if (showInfo) setShowInfo(false) }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-white/50 text-sm tabular-nums">
          {total > 1 ? `${index + 1} / ${total}` : ''}
        </span>
        <div className="flex items-center gap-2">
          {isAdmin && onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-red-400">Delete photo?</span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs px-2 py-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 text-white/70 hover:bg-red-600 hover:text-white transition-colors"
                aria-label="Delete photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => setShowInfo((s) => !s)}
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${showInfo ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
            aria-label="Photo info"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-40"
            aria-label="Download photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="relative flex-1 flex items-center justify-center min-h-0"
        onClick={(e) => { e.stopPropagation(); setShowInfo(false) }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-3 sm:left-6 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white text-2xl hover:bg-black/80 transition-colors"
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}

        <img
          key={current.id}
          src={current.url}
          alt={current.filename}
          className="max-h-full max-w-full object-contain rounded-lg shadow-2xl select-none"
          draggable={false}
        />

        {total > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-3 sm:right-6 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white text-2xl hover:bg-black/80 transition-colors"
            aria-label="Next photo"
          >
            ›
          </button>
        )}
      </div>

      {/* Caption bar */}
      {(current.caption || canEditCaption) && !editingCaption && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-5 py-2 bg-black/60"
          onClick={(e) => e.stopPropagation()}
        >
          {canEditCaption ? (
            <button
              type="button"
              onClick={() => { setCaptionDraft(current.caption ?? ''); setEditingCaption(true) }}
              className="flex-1 text-left text-sm italic text-gray-200 hover:text-white transition-colors"
              aria-label="Edit caption"
            >
              {current.caption || <span className="text-gray-500 not-italic">No caption</span>}
            </button>
          ) : (
            <p className="flex-1 text-sm text-gray-200 italic">{current.caption}</p>
          )}
          {canEditCaption && (
            <button
              type="button"
              onClick={() => { setCaptionDraft(current.caption ?? ''); setEditingCaption(true) }}
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Edit caption"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      )}
      {editingCaption && (
        <div
          className="flex-shrink-0 px-4 py-3 bg-gray-900/95 border-t border-white/10 flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            value={captionDraft}
            onChange={(e) => setCaptionDraft(e.target.value.slice(0, 280))}
            placeholder="Add a caption…"
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">{captionDraft.length}/280</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingCaption(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCaption}
                disabled={savingCaption}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
              >
                {savingCaption ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info panel */}
      {showInfo && (
        <div
          className="flex-shrink-0 bg-gray-900/95 border-t border-white/10 px-5 py-4 max-h-52 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Author</dt>
              <dd className="text-white">{current.uploader?.name ?? 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Uploaded</dt>
              <dd className="text-white">{uploadedAt}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">File size</dt>
              <dd className="text-white">{fmtBytes(current.sizeBytes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Format</dt>
              <dd className="text-white">{fmtMime(current.mimeType)}</dd>
            </div>
            {current.width && current.height && (
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Dimensions</dt>
                <dd className="text-white">{current.width} × {current.height}</dd>
              </div>
            )}
            {takenAt && (
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Taken</dt>
                <dd className="text-white">{takenAt}</dd>
              </div>
            )}
            {!!(current.exifData?.Make || current.exifData?.Model) && (
              <div className="col-span-2">
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Camera</dt>
                <dd className="text-white">
                  {[current.exifData.Make, current.exifData.Model].filter(Boolean).join(' ')}
                </dd>
              </div>
            )}
            {!!current.exifData?.LensModel && (
              <div className="col-span-2">
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Lens</dt>
                <dd className="text-white">{current.exifData.LensModel as string}</dd>
              </div>
            )}
            {current.exifData?.FocalLength !== undefined && (
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Focal length</dt>
                <dd className="text-white">{current.exifData.FocalLength as number}mm</dd>
              </div>
            )}
            {current.exifData?.FNumber !== undefined && (
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Aperture</dt>
                <dd className="text-white">f/{current.exifData.FNumber as number}</dd>
              </div>
            )}
            {current.exifData?.ExposureTime !== undefined && (
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Shutter</dt>
                <dd className="text-white">{fmtExposure(current.exifData.ExposureTime as number)}</dd>
              </div>
            )}
            {(current.exifData?.ISO ?? current.exifData?.ISOSpeedRatings) !== undefined && (
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">ISO</dt>
                <dd className="text-white">ISO {(current.exifData?.ISO ?? current.exifData?.ISOSpeedRatings) as number}</dd>
              </div>
            )}
            {current.exifData?.GPSLatitude !== undefined && current.exifData?.GPSLongitude !== undefined && (
              <div className="col-span-2">
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Location</dt>
                <dd className="text-white font-mono text-xs">
                  {fmtGPS(current.exifData.GPSLatitude as number, current.exifData.GPSLongitude as number)}
                </dd>
              </div>
            )}
            {!!current.exifData?.Software && (
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Software</dt>
                <dd className="text-white text-xs truncate">{current.exifData.Software as string}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
