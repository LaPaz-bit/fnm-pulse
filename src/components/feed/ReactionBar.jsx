import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { sendPushNotification } from '@/utils/pushNotifications'

const EMOJIS = ['🔥', '💪', '❤️', '🙌', '🎉']

export default function ReactionBar({ postId, authorId, initialReactions = [] }) {
  const { user } = useAuth()
  const [reactions, setReactions] = useState(initialReactions)

  function grouped() {
    return EMOJIS.map(emoji => {
      const rows = reactions.filter(r => r.emoji === emoji)
      return { emoji, count: rows.length, reacted: rows.some(r => r.user_id === user?.id) }
    })
  }

  async function toggle(emoji) {
    if (!user) return
    const existing = reactions.find(r => r.emoji === emoji && r.user_id === user.id)

    if (existing) {
      setReactions(prev => prev.filter(r => r.id !== existing.id))
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      const optimistic = { id: `opt-${Date.now()}`, user_id: user.id, target_id: postId, target_type: 'post', emoji }
      setReactions(prev => [...prev, optimistic])
      const { data } = await supabase
        .from('reactions')
        .insert({ user_id: user.id, target_id: postId, target_type: 'post', emoji })
        .select()
        .single()
      if (data) {
        setReactions(prev => prev.map(r => r.id === optimistic.id ? data : r))
        if (authorId && authorId !== user.id) {
          sendPushNotification(authorId, 'New reaction on your post', `Someone reacted ${emoji}`, '/')
        }
      }
    }
  }

  const groups = grouped()
  const anyReacted = groups.some(g => g.reacted)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {groups.map(({ emoji, count, reacted }) => (
        <button
          key={emoji}
          onClick={() => toggle(emoji)}
          className={[
            'flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium',
            'transition-all duration-150 active:scale-90 select-none',
            reacted
              ? 'bg-brand-light text-brand-dark ring-1 ring-brand-soft/60 shadow-sm'
              : count > 0
                ? 'bg-gray-50 text-gray-600 hover:bg-brand-lightest hover:text-brand-dark'
                : !anyReacted
                  ? 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
                  : 'text-gray-200 hover:text-gray-400 hover:bg-gray-50',
          ].join(' ')}
        >
          <span className={reacted ? 'scale-110 inline-block' : 'inline-block'}>{emoji}</span>
          {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
        </button>
      ))}
    </div>
  )
}
