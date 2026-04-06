import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import { formatRelativeTime } from '@/utils/formatDate'
import { MessageCircle } from 'lucide-react'

export default function InboxPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .rpc('get_conversations', { p_user_id: user.id })
      .then(({ data }) => {
        setConversations(data || [])
        setLoading(false)
      })
  }, [user])

  // Real-time: debounced refresh on new DM
  const refreshTimer = useRef(null)
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('inbox-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          if (payload.new.recipient_id !== user.id && payload.new.sender_id !== user.id) return
          clearTimeout(refreshTimer.current)
          refreshTimer.current = setTimeout(() => {
            supabase
              .rpc('get_conversations', { p_user_id: user.id })
              .then(({ data }) => setConversations(data || []))
          }, 500)
        },
      )
      .subscribe()
    return () => {
      clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [user])

  return (
    <div>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="font-display text-2xl font-black text-gradient italic">Messages</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : conversations.length === 0 ? (
        <EmptyInbox />
      ) : (
        <ul className="px-3 py-3 flex flex-col gap-2">
          {conversations.map((c) => (
            <li key={c.partner_id}>
              <button
                onClick={() => navigate(`/messages/${c.partner_id}`)}
                className={[
                  'flex items-center gap-3 w-full rounded-3xl px-3.5 py-3 transition text-left',
                  c.unread_count > 0 ? 'bg-brand-lightest' : 'bg-white shadow-card hover:shadow-card-hover',
                ].join(' ')}
              >
                <Avatar src={c.avatar_url} name={c.display_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-gray-900 truncate">{c.display_name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                      {formatRelativeTime(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-gray-400 truncate">{c.last_message}</p>
                    {c.unread_count > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 flex items-center justify-center bg-brand-pink text-white text-[10px] font-bold rounded-full px-1.5">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center gap-5 py-20 px-8 text-center animate-fade-up">
      <div className="w-20 h-20 rounded-full bg-brand-gradient flex items-center justify-center shadow-glow">
        <MessageCircle size={32} className="text-white" />
      </div>
      <div>
        <h2 className="font-display text-2xl font-black text-gray-900 italic mb-2">No messages yet</h2>
        <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
          Visit a member&apos;s profile to start a conversation.
        </p>
      </div>
    </div>
  )
}
