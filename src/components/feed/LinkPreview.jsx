import { ExternalLink } from 'lucide-react'

export default function LinkPreview({ preview, onDismiss }) {
  if (!preview) return null

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-gray-200 overflow-hidden hover:border-brand-soft transition-colors mt-3"
      onClick={e => e.stopPropagation()}
    >
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title || 'Link preview'}
          className="w-full h-40 object-cover"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      )}
      <div className="p-3">
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <ExternalLink size={11} />
          <span>{preview.domain}</span>
        </div>
        {preview.title && (
          <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  )
}
