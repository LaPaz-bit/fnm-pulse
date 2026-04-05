const sizes = {
  xs:  'w-7 h-7 text-xs',
  sm:  'w-9 h-9 text-sm',
  md:  'w-11 h-11 text-base',
  lg:  'w-16 h-16 text-xl',
  xl:  'w-24 h-24 text-3xl',
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// Warm, brand-adjacent palette
const BG_COLORS = [
  'bg-pink-100 text-pink-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-rose-100 text-rose-700',
  'bg-purple-100 text-purple-700',
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
]

function colorFor(str) {
  if (!str) return BG_COLORS[0]
  let hash = 0
  for (const ch of str) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return BG_COLORS[hash % BG_COLORS.length]
}

export default function Avatar({ src, name, size = 'md', className = '', onClick }) {
  const sizeClass = sizes[size] ?? sizes.md
  const cursor = onClick ? 'cursor-pointer' : 'cursor-default'
  const base = `${sizeClass} rounded-full flex-shrink-0 ${cursor} ${className}`

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className={`${base} object-cover`}
        onClick={onClick}
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
    )
  }

  return (
    <div
      className={`${base} ${colorFor(name)} flex items-center justify-center font-bold`}
      onClick={onClick}
    >
      {initials(name)}
    </div>
  )
}
