import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, fullScreen = false }) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div
        className={[
          'bg-white w-full max-w-lg shadow-2xl',
          fullScreen
            ? 'h-full rounded-none'
            : 'rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 pb-6 pt-4">{children}</div>
      </div>
    </div>
  )
}
