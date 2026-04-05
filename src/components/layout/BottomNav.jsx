import { NavLink } from 'react-router-dom'
import { Home, Target, MessageCircle, Plus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'

export default function BottomNav({ onPostPress }) {
  const { profile } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-40">
      <div
        className="bg-white border-t border-gray-200 px-2 flex items-center justify-around"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)', paddingTop: '8px' }}
      >
        <Tab to="/" icon={Home} />
        <Tab to="/goals" icon={Target} />

        {/* Centre post button */}
        <button
          onClick={onPostPress}
          aria-label="New post"
          className="flex items-center justify-center w-11 h-11 rounded-xl text-gray-400 hover:text-gray-900 active:scale-90 transition-all duration-150"
        >
          <Plus size={24} strokeWidth={1.8} />
        </button>

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

function Tab({ to, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 ${
          isActive ? 'text-gray-900' : 'text-gray-400'
        }`
      }
    >
      {({ isActive }) => (
        <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
      )}
    </NavLink>
  )
}
