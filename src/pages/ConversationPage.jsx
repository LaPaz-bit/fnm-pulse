import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import { formatRelativeTime } from '@/utils/formatDate'
import { ArrowLeft, Send } from 'lucide-react'
import { sendPushNotification } from '@/utils/pushNotifications'

export default function ConversationPage() {
  const { partnerId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [partner, setPartner] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  // Fetch partner profile
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .eq('id', partnerId)
      .single()
      .then(({ data }) => setPartner(data))
  }, [partnerId])

  // Fetch messages
  useEffect(() => {
    if (!user) return
    supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),` +
        `and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data || [])
        setLoading(false)
      })
  }, [user, partnerId])

  // Mark incoming messages as read
  useEffect(() => {
    if (!user) return
    supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('sender_id', partnerId)
      .eq('is_read', false)
      .then(({ error }) => {
        if (error) console.error('Failed to mark messages as read:', error)
      })
  }, [user, partnerId, messages.length])

  // Real-time
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`dm-${[user.id, partnerId].sort().join('-')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const m = payload.new
          const inConvo =
            (m.sender_id === user.id && m.recipient_id === partnerId) ||
            (m.sender_id === partnerId && m.recipient_id === user.id)
          if (inConvo) setMessages((prev) => [...prev, m])
        },
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, partnerId])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send() {
    const content = text.trim()
    if (!content || sending || !user) return
    setSending(true)
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      recipient_id: partnerId,
      content,
    })
    setSending(false)
    if (error) {
      console.error('Failed to send message:', error)
      alert('Message failed to send. Please try again.')
      return
    }
    setText('')
    sendPushNotification(
      partnerId,
      partner?.display_name ? `New message from ${partner.display_name}` : 'New message',
      content.length > 80 ? content.slice(0, 80) + '…' : content,
      `/messages/${user.id}`,
    )
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/messages')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition"
        >
          <ArrowLeft size={18} />
        </button>
        {partner ? (
          <>
            <Avatar src={partner.avatar_url} name={partner.display_name} size="sm" />
            <div>
              <p className="font-bold text-sm text-gray-900 leading-tight">{partner.display_name}</p>
              <p className="text-xs text-gray-400">@{partner.username}</p>
            </div>
          </>
        ) : (
          <div className="w-32 h-4 bg-gray-100 rounded animate-pulse" />
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-canvas">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">
            Say hello to {partner?.display_name}!
          </p>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} isOwn={m.sender_id === user?.id} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 rounded-2xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-light max-h-32"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-pink text-white hover:bg-brand-dark transition disabled:opacity-40 shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

function MessageBubble({ message, isOwn }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[78%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed',
          isOwn
            ? 'bg-brand-gradient text-white rounded-br-md shadow-[0_2px_8px_rgba(250,94,189,0.3)]'
            : 'bg-white text-gray-900 rounded-bl-md shadow-card',
        ].join(' ')}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
          {formatRelativeTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}
