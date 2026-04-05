import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import { Users, CalendarDays, ArrowRight, Check, Lock } from 'lucide-react'
import { onGoalJoined } from '@/utils/badges'
import { useToast } from '@/context/ToastContext'

function daysRemaining(endDate) {
  if (!endDate) return null
  const diff = Math.ceil((new Date(endDate) - new Date()) / 86400000)
  if (diff < 0) return { label: 'Ended', urgent: false }
  if (diff === 0) return { label: 'Last day!', urgent: true }
  if (diff <= 3) return { label: `${diff}d left`, urgent: true }
  return { label: `${diff}d left`, urgent: false }
}

export default function GoalCard({ goal, isArchived = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const memberCount = goal.goal_members?.length ?? 0
  const alreadyJoined = goal.goal_members?.some(m => m.user_id === user?.id)
  const { addToast } = useToast()
  const [joined, setJoined] = useState(alreadyJoined)
  const [joining, setJoining] = useState(false)
  const days = daysRemaining(goal.end_date)

  async function join(e) {
    e.stopPropagation()
    if (joined || joining || isArchived) return
    setJoining(true)
    const { error } = await supabase.from('goal_members').insert({ goal_id: goal.id, user_id: user.id })
    setJoining(false)
    if (!error || error.code === '23505') {
      setJoined(true)
      const badge = await onGoalJoined(user.id)
      if (badge) addToast({ emoji: badge.emoji, message: `Badge Earned: ${badge.label}!`, sub: badge.description })
      navigate(`/goals/${goal.id}`)
    }
  }

  return (
    <div
      onClick={() => navigate(`/goals/${goal.id}`)}
      className="bg-white rounded-3xl shadow-card hover:shadow-card-hover border border-gray-100/80 p-4 cursor-pointer transition-all duration-200 active:scale-[0.99]"
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-gray-900 text-sm leading-snug flex-1">{goal.title}</h3>
        {isArchived && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 font-medium">
            <Lock size={9} /> Archived
          </span>
        )}
      </div>

      {goal.description && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">{goal.description}</p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
        {goal.owner && (
          <div className="flex items-center gap-1.5">
            <Avatar src={goal.owner.avatar_url} name={goal.owner.display_name} size="xs" />
            <span className="font-medium">{goal.owner.display_name}</span>
          </div>
        )}
        <span className="flex items-center gap-1">
          <Users size={11} /> {memberCount}
        </span>
        {days && (
          <span className={`flex items-center gap-1 font-semibold ${days.urgent ? 'text-orange-400' : ''}`}>
            <CalendarDays size={11} /> {days.label}
          </span>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {goal.goal_members?.slice(0, 5).map(m => (
            <Avatar key={m.user_id} src={m.profiles?.avatar_url} name={m.profiles?.display_name || '?'}
              size="xs" className="ring-2 ring-white" />
          ))}
          {memberCount > 5 && (
            <span className="w-7 h-7 rounded-full bg-brand-lightest ring-2 ring-white flex items-center justify-center text-[10px] text-brand-pink font-bold">
              +{memberCount - 5}
            </span>
          )}
        </div>

        {isArchived ? (
          <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
            View <ArrowRight size={11} />
          </span>
        ) : joined ? (
          <span className="flex items-center gap-1 text-xs text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-full">
            <Check size={11} /> Joined
          </span>
        ) : (
          <button onClick={join} disabled={joining}
            className="flex items-center gap-1 text-xs font-bold text-brand-pink bg-brand-lightest border border-brand-pink px-3.5 py-1.5 rounded-full hover:bg-brand-light active:scale-95 transition-all">
            {joining ? '…' : <>I&apos;m in! <ArrowRight size={11} /></>}
          </button>
        )}
      </div>
    </div>
  )
}
