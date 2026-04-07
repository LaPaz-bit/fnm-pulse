import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { StaggerList, StaggerItem } from '@/components/ui/Motion'
import { formatRelativeTime } from '@/utils/formatDate'
import {
  ArrowLeft, Users, CalendarDays, CheckCircle2,
  Send, Lock, Zap, Trophy
} from 'lucide-react'
import { onGoalJoined, onGoalCompleted } from '@/utils/badges'
import { useToast } from '@/context/ToastContext'

// This page handles both /goals/:goalId and /challenges/:challengeId
export default function GoalThreadPage() {
  const { goalId, challengeId } = useParams()
  const isChallenge = !!challengeId
  const id = goalId || challengeId
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()

  const { addToast } = useToast()
  const [item, setItem] = useState(null)
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [updateText, setUpdateText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showCompleteCelebration, setShowCompleteCelebration] = useState(false)
  const bottomRef = useRef(null)

  const membersTable = isChallenge ? 'challenge_members' : 'goal_members'
  const idField = isChallenge ? 'challenge_id' : 'goal_id'

  const isExpired = item?.end_date
    ? new Date(item.end_date) < new Date(new Date().setHours(0, 0, 0, 0))
    : false
  const isArchived = isChallenge
    ? item?.status === 'ended' || isExpired
    : item?.status !== 'active' || isExpired

  useEffect(() => {
    fetchAll()
  }, [id])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchItem(), fetchUpdates()])
    setLoading(false)
  }

  async function fetchItem() {
    const table = isChallenge ? 'challenges' : 'goals'
    const select = isChallenge
      ? `*, creator:profiles!created_by(id, display_name, avatar_url), challenge_members(user_id, profiles(display_name, avatar_url))`
      : `*, owner:profiles!owner_id(id, display_name, avatar_url), goal_members(user_id, profiles:profiles!goal_members_user_id_fkey(display_name, avatar_url))`

    const { data } = await supabase.from(table).select(select).eq('id', id).single()
    setItem(data)

    if (user && data) {
      const members = isChallenge ? data.challenge_members : data.goal_members
      setIsMember(members?.some(m => m.user_id === user.id) ?? false)
    }
  }

  async function fetchUpdates() {
    const { data } = await supabase
      .from('goal_updates')
      .select(`*, author:profiles!user_id(id, display_name, avatar_url, username)`)
      .eq(idField, id)
      .order('created_at', { ascending: true })
    setUpdates(data || [])
    if (user && data) {
      setHasCompleted(data.some(u => u.user_id === user.id && u.is_completion))
    }
  }

  async function join() {
    if (!user) return
    const { error } = await supabase.from(membersTable).insert({
      [idField]: id,
      user_id: user.id,
    })
    if (!error || error.code === '23505') {
      setIsMember(true)
      fetchItem()
      const badge = await onGoalJoined(user.id)
      if (badge) addToast({ emoji: badge.emoji, message: `Badge Earned: ${badge.label}!`, sub: badge.description })
    }
  }

  async function postUpdate(e) {
    e.preventDefault()
    if (!updateText.trim() || !user) return
    setSubmitting(true)
    const { data } = await supabase
      .from('goal_updates')
      .insert({
        [idField]: id,
        user_id:  user.id,
        note:     updateText.trim(),
      })
      .select(`*, author:profiles!user_id(id, display_name, avatar_url, username)`)
      .single()
    setSubmitting(false)
    if (data) {
      setUpdates(prev => [...prev, data])
      setUpdateText('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  async function markComplete() {
    if (!user || hasCompleted) return
    setCompleting(true)
    const { data } = await supabase
      .from('goal_updates')
      .insert({
        [idField]:     id,
        user_id:       user.id,
        note:          '🏁 Marked this as complete!',
        is_completion: true,
      })
      .select(`*, author:profiles!user_id(id, display_name, avatar_url, username)`)
      .single()
    setCompleting(false)
    if (data) {
      setUpdates(prev => [...prev, data])
      setHasCompleted(true)
      setShowCompleteCelebration(true)
      setTimeout(() => { setShowCompleteCelebration(false) }, 2000)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      const badge = await onGoalCompleted(user.id)
      if (badge) addToast({ emoji: badge.emoji, message: `Badge Earned: ${badge.label}!`, sub: badge.description })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
        <p className="text-gray-500">This {isChallenge ? 'challenge' : 'goal'} could not be found.</p>
        <Button variant="secondary" onClick={() => navigate('/goals')}>Back to Goals</Button>
      </div>
    )
  }

  const creator = isChallenge ? item.creator : item.owner
  const members = isChallenge ? item.challenge_members : item.goal_members
  const memberCount = members?.length ?? 0

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className={[
        'sticky top-0 z-30 px-4 py-3 border-b',
        isChallenge
          ? 'bg-gradient-to-r from-brand-pink to-brand-soft border-brand-soft'
          : 'bg-white/90 backdrop-blur-md border-gray-100',
      ].join(' ')}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/goals')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition ${
              isChallenge ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            {isChallenge && (
              <div className="flex items-center gap-1 mb-0.5">
                <Zap size={11} className="text-white" />
                <span className="text-xs font-black text-white uppercase tracking-wider">Official Challenge</span>
              </div>
            )}
            <h1 className={`font-black text-sm leading-tight truncate ${isChallenge ? 'text-white' : 'text-gray-900'}`}>
              {item.title}
            </h1>
          </div>
        </div>
      </header>

      {/* Info card */}
      <div className={[
        'px-4 py-4 border-b',
        isChallenge ? 'bg-brand-light' : 'bg-gray-50',
      ].join(' ')}>
        {item.description && (
          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{item.description}</p>
        )}
        {item.rules && (
          <p className="text-xs text-gray-500 mb-3 italic">{item.rules}</p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          {creator && (
            <div className="flex items-center gap-1.5">
              <Avatar src={creator.avatar_url} name={creator.display_name} size="xs" />
              <span>by {creator.display_name}</span>
            </div>
          )}
          <span className="flex items-center gap-1">
            <Users size={12} />
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
          {item.end_date && (
            <span className="flex items-center gap-1">
              <CalendarDays size={12} />
              {isArchived ? 'Ended' : `Ends ${new Date(item.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </span>
          )}
          {isArchived && (
            <span className="flex items-center gap-1 text-gray-400">
              <Lock size={12} />
              Read-only
            </span>
          )}
        </div>

        {/* Join button (if not a member) */}
        {!isMember && !isArchived && (
          <div className="mt-3">
            <Button size="sm" onClick={join}>
              I&apos;m in! 🙌
            </Button>
          </div>
        )}
      </div>

      {/* Updates thread */}
      <div className="flex-1 px-4 py-4 pb-6">
        {updates.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="text-3xl">🚀</span>
            <p className="text-gray-400 text-sm">
              {isArchived
                ? 'No updates were posted for this one.'
                : 'No updates yet. Be the first to post your progress!'}
            </p>
          </div>
        ) : (
          <StaggerList className="flex flex-col gap-4">
            {updates.map(update => (
              <StaggerItem key={update.id}>
                <UpdateItem update={update} currentUserId={user?.id} />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Bottom input area */}
      {!isArchived && isMember && (
        <motion.div
          className="sticky bottom-16 bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-2"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.15 }}
        >
          {/* Mark complete */}
          {!hasCompleted && (
            <button
              onClick={markComplete}
              disabled={completing}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border-2 border-dashed border-green-300 text-green-600 text-sm font-semibold hover:bg-green-50 transition-colors"
            >
              <CheckCircle2 size={16} />
              {completing ? 'Saving…' : 'Mark as Complete 🏁'}
            </button>
          )}
          {hasCompleted && (
            <div className="flex items-center justify-center gap-2 py-2 text-green-600 text-sm font-semibold">
              <CheckCircle2 size={16} />
              You completed this {isChallenge ? 'challenge' : 'goal'}! 🎉
            </div>
          )}

          {/* Post update */}
          <form onSubmit={postUpdate} className="flex items-center gap-2">
            <Avatar src={null} name={user?.email} size="xs" />
            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
              <input
                value={updateText}
                onChange={e => setUpdateText(e.target.value)}
                placeholder="Post a progress update…"
                className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder:text-gray-400"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!updateText.trim() || submitting}
                className="text-brand-pink disabled:text-gray-300 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Not a member CTA */}
      {!isArchived && !isMember && (
        <div className="sticky bottom-16 bg-white border-t border-gray-100 px-4 py-3 text-center">
          <p className="text-sm text-gray-500 mb-2">Join to post updates and mark complete</p>
          <Button size="sm" onClick={join}>Join this {isChallenge ? 'Challenge' : 'Goal'} 🙌</Button>
        </div>
      )}

      {/* Goal complete celebration overlay */}
      <AnimatePresence>
        {showCompleteCelebration && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-2xl">
                <CheckCircle2 size={52} className="text-white" strokeWidth={2.5} />
              </div>
              <p className="text-white font-black text-2xl drop-shadow-lg">Complete! 🎉</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function UpdateItem({ update, currentUserId }) {
  const isOwn = update.user_id === currentUserId
  const author = update.author

  if (update.is_completion) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="flex-1 h-px bg-green-200" />
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
          <CheckCircle2 size={13} className="text-green-500" />
          <span className="text-xs font-bold text-green-700">
            {author?.display_name || 'A member'} completed this!
          </span>
          <span className="text-xs text-green-500">{formatRelativeTime(update.created_at)}</span>
        </div>
        <div className="flex-1 h-px bg-green-200" />
      </div>
    )
  }

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar src={author?.avatar_url} name={author?.display_name} size="xs" />
      <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={[
          'rounded-2xl px-3 py-2',
          isOwn
            ? 'bg-brand-pink text-white rounded-tr-sm'
            : 'bg-gray-100 text-gray-900 rounded-tl-sm',
        ].join(' ')}>
          {!isOwn && (
            <p className={`text-xs font-semibold mb-0.5 ${isOwn ? 'text-white/80' : 'text-gray-500'}`}>
              {author?.display_name}
            </p>
          )}
          <p className="text-sm leading-relaxed">{update.note}</p>
        </div>
        <span className="text-xs text-gray-400 mt-0.5 px-1">
          {formatRelativeTime(update.created_at)}
        </span>
      </div>
    </div>
  )
}
