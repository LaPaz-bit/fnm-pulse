import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Spinner from '@/components/ui/Spinner'
import Avatar from '@/components/ui/Avatar'
import { Bell, MessageCircle, Trash2 } from 'lucide-react'
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
      .select('*, actor:profiles!notifications_actor_id_fkey(id, display_name, username, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Enrich badge notifications with badge details
    const items = data || []
    const badgeIds = items
      .filter(n => n.type === 'badge' && n.reference_id)
      .map(n => n.reference_id)
    let badgeMap = {}
    if (badgeIds.length > 0) {
      const { data: badges } = await supabase
        .from('badges')
        .select('id, name, description')
        .in('id', badgeIds)
      badgeMap = Object.fromEntries((badges || []).map(b => [b.id, b]))
    }
    setNotifications(items.map(n =>
      n.type === 'badge' && badgeMap[n.reference_id]
        ? { ...n, badge: badgeMap[n.reference_id] }
        : n
    ))
    setLoading(false)

    // Mark all as read
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }

  async function deleteNotification(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
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
            <SwipeToDelete key={n.id} onDelete={() => deleteNotification(n.id)}>
              <NotificationItem notification={n} />
            </SwipeToDelete>
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationItem({ notification: n }) {
  const navigate = useNavigate()

  if (n.type === 'dm_received' && n.actor) {
    return (
      <button
        onClick={() => navigate(`/messages/${n.actor.id}`)}
        className={[
          'flex items-center gap-3 rounded-3xl p-3.5 w-full text-left transition',
          !n.is_read ? 'bg-brand-lightest' : 'bg-white shadow-card',
        ].join(' ')}
      >
        <Avatar src={n.actor.avatar_url} name={n.actor.display_name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight">
            {n.actor.display_name} sent you a message
          </p>
          <p className="text-xs text-gray-400 mt-0.5">@{n.actor.username}</p>
          <p className="text-xs text-gray-300 mt-1">{formatRelativeTime(n.created_at)}</p>
        </div>
        {!n.is_read && (
          <div className="w-2 h-2 rounded-full bg-brand-pink shrink-0" />
        )}
      </button>
    )
  }

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

const SWIPE_THRESHOLD = 80
const DELETE_THRESHOLD = 140

function SwipeToDelete({ children, onDelete }) {
  const containerRef = useRef(null)
  const startX = useRef(0)
  const currentX = useRef(0)
  const swiping = useRef(false)

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX
    currentX.current = 0
    swiping.current = false
  }, [])

  const onTouchMove = useCallback((e) => {
    const diff = startX.current - e.touches[0].clientX
    // Only allow swiping left (positive diff)
    if (diff < 0) {
      currentX.current = 0
      if (containerRef.current) containerRef.current.style.transform = ''
      return
    }
    if (diff > 10) swiping.current = true
    currentX.current = Math.min(diff, DELETE_THRESHOLD + 20)
    if (containerRef.current) {
      containerRef.current.style.transform = `translateX(-${currentX.current}px)`
      containerRef.current.style.transition = 'none'
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!containerRef.current) return
    containerRef.current.style.transition = 'transform 0.25s ease'

    if (currentX.current >= DELETE_THRESHOLD) {
      containerRef.current.style.transform = 'translateX(-100%)'
      containerRef.current.style.opacity = '0'
      containerRef.current.style.transition = 'transform 0.25s ease, opacity 0.25s ease'
      setTimeout(onDelete, 250)
    } else {
      containerRef.current.style.transform = 'translateX(0)'
    }
    swiping.current = false
  }, [onDelete])

  const onClick = useCallback((e) => {
    if (swiping.current) e.stopPropagation()
  }, [])

  return (
    <div className="relative overflow-hidden rounded-3xl">
      {/* Delete background */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-3xl">
        <Trash2 size={20} className="text-white" />
      </div>
      {/* Swipeable content */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClickCapture={onClick}
        className="relative z-10"
      >
        {children}
      </div>
    </div>
  )
}
