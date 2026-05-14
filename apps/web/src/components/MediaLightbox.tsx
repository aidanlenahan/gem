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
}: {
  media: LightboxMedia[]
  initialIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const [showInfo, setShowInfo] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const total = media.length
  const current = media[index]
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const prev = useCallback(() => { setIndex((i) => (i - 1 + total) % total); setShowInfo(false) }, [total])
  const next = useCallback(() => { setIndex((i) => (i + 1) % total); setShowInfo(false) }, [total])

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
            {(current.exifData?.Make || current.exifData?.Model) && (
              <div className="col-span-2">
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Camera</dt>
                <dd className="text-white">
                  {[current.exifData.Make, current.exifData.Model].filter(Boolean).join(' ')}
                </dd>
              </div>
            )}
            {current.exifData?.LensModel && (
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
            {current.exifData?.Software && (
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
