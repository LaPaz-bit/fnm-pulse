import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import { Users, CalendarDays, ArrowRight, Check, Lock, Zap } from 'lucide-react'
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

export default function ChallengeCard({ challenge, isArchived = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const memberCount = challenge.challenge_members?.length ?? 0
  const alreadyJoined = challenge.challenge_members?.some(m => m.user_id === user?.id)
  const { addToast } = useToast()
  const [joined, setJoined] = useState(alreadyJoined)
  const [joining, setJoining] = useState(false)
  const days = daysRemaining(challenge.end_date)

  async function join(e) {
    e.stopPropagation()
    if (joined || joining || isArchived) return
    setJoining(true)
    const { error } = await supabase.from('challenge_members').insert({ challenge_id: challenge.id, user_id: user.id })
    setJoining(false)
    if (!error || error.code === '23505') {
      setJoined(true)
      const badge = await onGoalJoined(user.id)
      if (badge) addToast({ emoji: badge.emoji, message: `Badge Earned: ${badge.label}!`, sub: badge.description })
      navigate(`/challenges/${challenge.id}`)
    }
  }

  return (
    <div
      onClick={() => navigate(`/challenges/${challenge.id}`)}
      className="relative overflow-hidden rounded-3xl p-4 cursor-pointer transition-all duration-200 active:scale-[0.99] hover:brightness-105"
      style={{ background: 'linear-gradient(135deg, #FA5EBD 0%, #C4248E 100%)' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-8 left-8 w-32 h-32 rounded-full bg-white/8 pointer-events-none" />

      <div className="relative">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <Zap size={10} className="text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">
              Official Challenge
            </span>
          </div>
          {isArchived && (
            <span className="flex items-center gap-1 text-[10px] text-white/70 bg-black/20 px-2 py-0.5 rounded-full">
              <Lock size={9} /> Archived
            </span>
          )}
        </div>

        <h3 className="font-display font-black text-white text-xl italic leading-tight mb-1">{challenge.title}</h3>

        {challenge.description && (
          <p className="text-xs text-white/75 line-clamp-2 mb-3 leading-relaxed">{challenge.description}</p>
        )}

        {(challenge.start_date || challenge.end_date) && (
          <div className="flex items-center gap-1 text-xs text-white/70 mb-3">
            <CalendarDays size={11} />
            {challenge.start_date && (
              <span>{new Date(challenge.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            )}
            {challenge.start_date && challenge.end_date && <span>–</span>}
            {challenge.end_date && (
              <span>{new Date(challenge.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            )}
            {days && (
              <span className={`ml-2 font-bold ${days.urgent ? 'text-yellow-300' : 'text-white/90'}`}>
                · {days.label}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-white/75 font-medium">
            <Users size={11} /> {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>

          {isArchived ? (
            <span className="flex items-center gap-1 text-xs text-white/80 font-medium">
              View <ArrowRight size={11} />
            </span>
          ) : joined ? (
            <span className="flex items-center gap-1 text-xs font-bold text-brand-pink bg-white px-3 py-1.5 rounded-full">
              <Check size={11} /> Joined
            </span>
          ) : (
            <button onClick={join} disabled={joining}
              className="flex items-center gap-1 text-xs font-bold text-brand-pink bg-white px-3.5 py-1.5 rounded-full hover:bg-brand-light active:scale-95 transition-all shadow-sm">
              {joining ? '…' : <>I&apos;m in! <ArrowRight size={11} /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
