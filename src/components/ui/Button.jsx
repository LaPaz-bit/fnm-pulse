import Spinner from './Spinner'

const variants = {
  primary:
    'bg-brand-lightest text-brand-pink border-2 border-brand-pink hover:bg-brand-light active:scale-95',
  secondary:
    'bg-white text-brand-pink border-2 border-brand-pink hover:bg-brand-lightest active:scale-95 shadow-sm',
  ghost:
    'bg-transparent text-gray-500 hover:bg-brand-lightest hover:text-brand-pink active:scale-95',
  danger:
    'bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-sm',
  soft:
    'bg-brand-light text-brand-dark hover:bg-brand-soft/40 active:scale-95',
}

const sizeCls = {
  sm: 'px-3.5 py-1.5 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-7 py-3.5 text-base gap-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  fullWidth = false,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center rounded-full font-semibold',
        'transition-all duration-200 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none',
        variants[variant],
        sizeCls[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
