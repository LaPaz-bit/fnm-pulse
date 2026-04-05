import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { CheckCircle } from 'lucide-react'

const BADGES = [
  { type: 'you_got_this',  label: "You've got this!",  emoji: '💪' },
  { type: 'proud_of_you',  label: 'Proud of you!',     emoji: '🌟' },
  { type: 'crushed_it',    label: 'Crushed it!',        emoji: '🔥' },
]

export default function EncouragementBadgeModal({ postId, toUserId, onClose }) {
  const { user } = useAuth()
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function send() {
    if (!selected || !user) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.from('encouragement_badges').insert({
      from_user_id: user.id,
      to_user_id:   toUserId,
      post_id:      postId,
      badge_type:   selected,
      message:      BADGES.find(b => b.type === selected)?.label,
    })
    setLoading(false)
    if (err) {
      if (err.code === '23505') {
        setError("You've already encouraged this post!")
      } else {
        setError('Something went wrong. Try again.')
      }
      return
    }
    setSent(true)
    setTimeout(onClose, 1800)
  }

  return (
    <Modal title="Send Encouragement" onClose={onClose}>
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <CheckCircle size={48} className="text-brand-pink" />
          <p className="font-bold text-gray-900 text-lg">Encouragement sent! 🎉</p>
          <p className="text-sm text-gray-500">You're making someone's day.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">Pick a badge to send to this member:</p>
          <div className="flex flex-col gap-2">
            {BADGES.map(({ type, label, emoji }) => (
              <button
                key={type}
                onClick={() => setSelected(type)}
                className={[
                  'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                  selected === type
                    ? 'border-brand-pink bg-brand-light'
                    : 'border-gray-200 hover:border-brand-soft',
                ].join(' ')}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="font-semibold text-gray-900">{label}</span>
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            fullWidth
            loading={loading}
            disabled={!selected}
            onClick={send}
          >
            Send Encouragement ✨
          </Button>
        </div>
      )}
    </Modal>
  )
}
