import { forwardRef } from 'react'

const Input = forwardRef(function Input(
  { label, error, className = '', textarea = false, ...props },
  ref
) {
  const base = [
    'w-full rounded-2xl border bg-white px-4 py-3 text-sm text-gray-900',
    'placeholder:text-gray-300 outline-none transition-all duration-200',
    'focus:border-brand-pink focus:ring-2 focus:ring-brand-light',
    'hover:border-gray-300',
    error ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
    className,
  ].join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      )}
      {textarea ? (
        <textarea ref={ref} className={`${base} resize-none`} {...props} />
      ) : (
        <input ref={ref} className={base} {...props} />
      )}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
})

export default Input
