import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import { formatRelativeTime } from '@/utils/formatDate'
import { Send, Trash2 } from 'lucide-react'
import { sendPushNotification } from '@/utils/pushNotifications'

export default function CommentSection({ postId, authorId }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchComments()
  }, [postId])

  async function fetchComments() {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*, author:profiles!author_id(id, display_name, avatar_url, username)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoading(false)
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!text.trim() || !user) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: user.id, content: text.trim() })
      .select('*, author:profiles!author_id(id, display_name, avatar_url, username)')
      .single()
    setSubmitting(false)
    if (!error && data) {
      setComments(prev => [...prev, data])
      setText('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      if (authorId && authorId !== user.id) {
        sendPushNotification(
          authorId,
          `${data.author?.display_name || 'Someone'} commented on your post`,
          text.trim().length > 80 ? text.trim().slice(0, 80) + '…' : text.trim(),
          '/',
        )
      }
    }
  }

  async function deleteComment(commentId) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    await supabase.from('comments').delete().eq('id', commentId)
  }

  return (
    <div className="pt-3 border-t border-gray-100">
      {loading ? (
        <p className="text-xs text-gray-400 py-2">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No comments yet. Be the first to cheer them on! 🙌</p>
      ) : (
        <div className="flex flex-col gap-3 mb-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar
                src={c.author?.avatar_url}
                name={c.author?.display_name}
                size="xs"
              />
              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-900">
                      {c.author?.display_name || 'Member'}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mt-0.5 break-words">{c.content}</p>
                </div>
                {c.author_id === user?.id && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 mt-0.5 px-1 transition-colors"
                  >
                    <Trash2 size={11} />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Comment input */}
      {user && (
        <form onSubmit={submitComment} className="flex items-center gap-2 mt-1">
          <Avatar src={null} name={user?.email} size="xs" />
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder:text-gray-400"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="text-brand-pink disabled:text-gray-300 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
