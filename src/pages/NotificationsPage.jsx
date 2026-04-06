import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Spinner from '@/components/ui/Spinner'
import { Bell } from 'lucide-react'
import { formatRelativeTime } from '@/utils/formatDate'
import { BADGE_META } from '@/utils/badges'

export default function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchAndMarkRead()
  }, [user])

  async function fetchAndMarkRead() {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*, badge:badges!reference_id(id, name, description)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)

    // Mark all as read
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }

  return (
    <div>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="font-display text-2xl font-black text-gradient italic">Notifications</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center px-6 animate-fade-up">
          <div className="w-20 h-20 rounded-full bg-brand-gradient flex items-center justify-center shadow-glow">
            <Bell size={32} className="text-white" />
          </div>
          <div>
            <p className="font-display font-black text-xl text-gray-900 italic mb-1">All caught up!</p>
            <p className="text-sm text-gray-400">Badges, reactions, and activity will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="px-3 py-3 flex flex-col gap-2">
          {notifications.map(n => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationItem({ notification: n }) {
  if (n.type === 'badge' && n.badge) {
    const meta = BADGE_META[n.badge.name] ?? { emoji: '🎖️', label: n.badge.name }
    return (
      <div className={[
        'flex items-center gap-3 rounded-3xl p-3.5',
        !n.is_read ? 'bg-brand-lightest' : 'bg-white shadow-card',
      ].join(' ')}>
        <div className="w-11 h-11 rounded-2xl bg-brand-gradient flex items-center justify-center text-xl shrink-0 shadow-sm">
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight">
            Badge Earned: {meta.label}!
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{n.badge.description}</p>
          <p className="text-xs text-gray-300 mt-1">{formatRelativeTime(n.created_at)}</p>
        </div>
        {!n.is_read && (
          <div className="w-2 h-2 rounded-full bg-brand-pink shrink-0" />
        )}
      </div>
    )
  }

  // Generic fallback for future notification types
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 bg-white">
      <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-2xl shrink-0">
        🔔
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700">{n.type}</p>
        <p className="text-xs text-gray-400">{formatRelativeTime(n.created_at)}</p>
      </div>
    </div>
  )
}
