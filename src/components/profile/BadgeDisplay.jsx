import { BADGE_META } from '@/utils/badges'

export default function BadgeDisplay({ memberBadges = [], size = 'md' }) {
  if (memberBadges.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No badges yet — keep showing up! 💪</p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {memberBadges.map(mb => {
        const meta = BADGE_META[mb.badges?.name] ?? { emoji: '🎖️', label: mb.badges?.name }
        return (
          <div
            key={mb.id}
            title={mb.badges?.description}
            className={[
              'flex items-center gap-1.5 rounded-full border border-brand-soft bg-brand-light',
              size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1',
            ].join(' ')}
          >
            <span className={size === 'sm' ? 'text-sm' : 'text-base'}>{meta.emoji}</span>
            <span className={[
              'font-semibold text-brand-dark',
              size === 'sm' ? 'text-xs' : 'text-xs',
            ].join(' ')}>
              {meta.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
