import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Target, Bell, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'

export default function BottomNav() {
  const { profile, user } = useAuth()
  const [unreadDMs, setUnreadDMs] = useState(0)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  useEffect(() => {
    if (!user) return

    // Fetch initial counts
    async function fetchCounts() {
      const [{ count: dmCount }, { count: notifCount }] = await Promise.all([
        supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
      ])
      setUnreadDMs(dmCount || 0)
      setUnreadNotifs(notifCount || 0)

      // Update PWA app icon badge
      const total = (dmCount || 0) + (notifCount || 0)
      if ('setAppBadge' in navigator) {
        total > 0 ? navigator.setAppBadge(total) : navigator.clearAppBadge()
      }
    }
    fetchCounts()

    // Real-time updates
    const channel = supabase
      .channel('nav-badges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        () => fetchCounts(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchCounts(),
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-[60]">
      <div
        className="bg-white border-t border-gray-200 px-2 flex items-center justify-around"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)', paddingTop: '12px' }}
      >
        <Tab to="/" icon={Home} />
        <Tab to="/goals" icon={Target} />
        <Tab to="/notifications" icon={Bell} badge={unreadNotifs} />
        <Tab to="/messages" icon={MessageCircle} badge={unreadDMs} />

        {/* Profile tab with user avatar */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 ${
              isActive ? 'opacity-100' : 'opacity-50'
            }`
          }
        >
          {({ isActive }) => (
            <div className={`rounded-full overflow-hidden ${isActive ? 'ring-2 ring-brand-pink ring-offset-1' : ''}`}>
              <Avatar
                src={profile?.avatar_url}
                name={profile?.display_name}
                size="sm"
              />
            </div>
          )}
        </NavLink>
      </div>
    </nav>
  )
}

function Tab({ to, icon: Icon, forceInactive, badge = 0 }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 ${
          isActive && !forceInactive ? 'text-gray-900' : 'text-gray-400'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={24} strokeWidth={isActive && !forceInactive ? 2.5 : 1.8} />
          {badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
