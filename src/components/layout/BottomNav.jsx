import { NavLink } from 'react-router-dom'
import { Home, Target, Bell, MessageCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'

export default function BottomNav() {
  const { profile } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-[60]">
      <div
        className="bg-white border-t border-gray-200 px-2 flex items-center justify-around"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)', paddingTop: '12px' }}
      >
        <Tab to="/" icon={Home} />
        <Tab to="/goals" icon={Target} />
        <Tab to="/notifications" icon={Bell} />
        <Tab to="/messages" icon={MessageCircle} />

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

function Tab({ to, icon: Icon, forceInactive }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 ${
          isActive && !forceInactive ? 'text-gray-900' : 'text-gray-400'
        }`
      }
    >
      {({ isActive }) => (
        <Icon size={24} strokeWidth={isActive && !forceInactive ? 2.5 : 1.8} />
      )}
    </NavLink>
  )
}
