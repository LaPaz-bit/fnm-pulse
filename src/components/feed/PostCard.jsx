import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import ReactionBar from './ReactionBar'
import CommentSection from './CommentSection'
import LinkPreview from './LinkPreview'
import EncouragementBadgeModal from './EncouragementBadgeModal'
import { formatRelativeTime } from '@/utils/formatDate'
import {
  MoreHorizontal, MessageCircle, Heart, Pin, Target,
  Pencil, Trash2, Flag, X, Check, Users, ArrowRight, Sparkles,
} from 'lucide-react'
import { onGoalJoined } from '@/utils/badges'
import { useToast } from '@/context/ToastContext'

export default function PostCard({ post, onDeleted, onUpdated }) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const isOwn = user?.id === post.author_id
  const isAdmin = profile?.role === 'admin'
  const author = post.author

  const goal = post.goals?.[0] ?? null
  const alreadyJoined = goal?.goal_members?.some(m => m.user_id === user?.id)

  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [saving, setSaving] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [encourageOpen, setEncourageOpen] = useState(false)
  const { addToast } = useToast()
  const [joined, setJoined] = useState(alreadyJoined ?? false)
  const [joining, setJoining] = useState(false)
  const [reactionsOpen, setReactionsOpen] = useState(false)

  const commentCount = post.comments?.length ?? 0
  const reactionCount = post.reactions?.length ?? 0
  const encourageCount = post.encouragement_badges?.length ?? 0

  async function saveEdit() {
    if (!editContent.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('posts')
      .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
      .eq('id', post.id)
    setSaving(false)
    if (!error) {
      setEditing(false)
      onUpdated?.({ ...post, content: editContent.trim() })
    }
  }

  async function deletePost() {
    if (!confirm('Delete this post?')) return
    setMenuOpen(false)
    if (post.is_goal_proposal) {
      await supabase.from('goals').delete().eq('post_id', post.id)
    }
    await supabase.from('posts').delete().eq('id', post.id)
    onDeleted?.(post.id)
  }

  async function togglePin() {
    setMenuOpen(false)
    const newVal = !post.is_pinned
    await supabase.from('posts').update({ is_pinned: newVal }).eq('id', post.id)
    onUpdated?.({ ...post, is_pinned: newVal })
  }

  async function reportPost() {
    setMenuOpen(false)
    if (!user) return
    await supabase.from('reported_posts').insert({
      reporter_id: user.id,
      target_id: post.id,
      target_type: 'post',
      reason: 'Reported by member',
    })
    alert('Post reported. Thank you! 🙏')
  }

  async function joinGoal() {
    if (!goal || !user || joined) return
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
    <article className={`bg-white border-b border-gray-100 ${post.is_pinned ? 'border-l-2 border-l-brand-pink' : ''}`}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <button onClick={() => author?.id && navigate(`/profile/${author.id}`)}>
          <Avatar
            src={author?.avatar_url}
            name={author?.display_name}
            size="sm"
            className={`ring-2 ring-offset-1 ${post.is_win ? 'ring-brand-pink' : 'ring-transparent'}`}
          />
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => author?.id && navigate(`/profile/${author.id}`)}
            className="font-semibold text-sm text-gray-900 hover:opacity-70 transition-opacity leading-tight block"
          >
            {author?.display_name || 'FNM Member'}
          </button>
          {post.is_pinned && (
            <span className="flex items-center gap-1 text-[10px] text-brand-pink font-medium">
              <Pin size={9} /> Pinned
            </span>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <PostMenu
                isOwn={isOwn} isAdmin={isAdmin} isPinned={post.is_pinned}
                onEdit={() => { setEditing(true); setMenuOpen(false) }}
                onDelete={deletePost} onReport={reportPost} onPin={togglePin}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Caption / edit ── */}
      <div className="px-3 pb-2">
        {editing ? (
          <div className="flex flex-col gap-2 mt-1">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={3}
              className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl p-3 outline-none resize-none focus:border-brand-pink"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setEditing(false); setEditContent(post.content) }}
                className="flex items-center gap-1 text-sm text-gray-400">
                <X size={13} /> Cancel
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-1 text-sm text-brand-pink font-semibold">
                <Check size={13} /> Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-900 leading-relaxed">
            <button
              onClick={() => author?.id && navigate(`/profile/${author.id}`)}
              className="font-semibold hover:opacity-70 transition-opacity mr-1.5"
            >
              {author?.display_name}
            </button>
            <span className="whitespace-pre-wrap break-words">{post.content}</span>
          </p>
        )}
      </div>

      {/* ── Link preview ── */}
      {post.link_preview && !editing && (
        <div className="px-3 pb-2">
          <LinkPreview preview={post.link_preview} />
        </div>
      )}

      {/* ── Media (full bleed) ── */}
      {post.media_urls?.length > 0 && !editing && (
        <img
          src={post.media_urls[0]}
          alt="Post media"
          className="w-full object-cover max-h-[480px]"
        />
      )}

      {/* ── Goal banner ── */}
      {post.is_goal_proposal && goal && (
        <div className="mx-3 mt-2 rounded-xl border border-brand-light bg-brand-lightest overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-light/60">
            <Target size={12} className="text-brand-pink shrink-0" />
            <span className="text-xs font-bold text-brand-dark truncate">{goal.title}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2.5 text-xs text-brand-dark/60">
              <span className="flex items-center gap-1"><Users size={11} />{goal.goal_members?.length ?? 0}</span>
              {goal.end_date && <span>{daysRemaining(goal.end_date)}</span>}
            </div>
            {goal.status === 'active' ? (
              <button
                onClick={joinGoal} disabled={joined || joining}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  joined ? 'bg-green-100 text-green-700' : 'bg-brand-lightest text-brand-pink border border-brand-pink hover:bg-brand-light'
                }`}
              >
                {joined ? <><Check size={10} /> Joined</> : joining ? '…' : <>I&apos;m in! <ArrowRight size={10} /></>}
              </button>
            ) : (
              <button onClick={() => navigate(`/goals/${goal.id}`)}
                className="flex items-center gap-1 text-xs text-brand-dark font-medium">
                View <ArrowRight size={10} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Action row ── */}
      <div className="flex items-center px-3 pt-2.5 pb-1 gap-4">
        {/* Reactions toggle */}
        <button
          onClick={() => setReactionsOpen(v => !v)}
          className={`flex items-center gap-1.5 transition-colors ${reactionsOpen ? 'text-brand-pink' : 'text-gray-800 hover:text-gray-500'}`}
        >
          <Heart size={24} strokeWidth={1.8} className={reactionsOpen ? 'fill-brand-pink stroke-brand-pink' : ''} />
          {reactionCount > 0 && <span className="text-sm font-semibold">{reactionCount}</span>}
        </button>

        {/* Comment */}
        <button
          onClick={() => setCommentsOpen(v => !v)}
          className="flex items-center gap-1.5 text-gray-800 hover:text-gray-500 transition-colors"
        >
          <MessageCircle size={24} strokeWidth={1.8} />
          {commentCount > 0 && <span className="text-sm font-semibold">{commentCount}</span>}
        </button>

        {/* Encourage (others only) */}
        {!isOwn && (
          <motion.button
            onClick={() => setEncourageOpen(true)}
            className="flex items-center gap-1.5 text-gray-800 hover:text-brand-pink transition-colors"
            whileTap={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <Sparkles size={22} strokeWidth={1.8} />
            {encourageCount > 0 && <span className="text-sm font-semibold">{encourageCount}</span>}
          </motion.button>
        )}

        {/* Win badge */}
        {post.is_win && (
          <span className="ml-auto flex items-center gap-1 text-xs font-bold text-brand-pink">
            🏆 Win
          </span>
        )}
      </div>

      {/* ── Reaction picker (expands inline) ── */}
      {reactionsOpen && (
        <div className="px-3 pb-2">
          <ReactionBar postId={post.id} authorId={post.author_id} initialReactions={post.reactions || []} />
        </div>
      )}

      {/* ── Encouragement summary ── */}
      {post.encouragement_badges?.length > 0 && (
        <div className="px-3 pb-2">
          <EncouragementSummary badges={post.encouragement_badges} />
        </div>
      )}

      {/* ── Comments ── */}
      {commentCount > 0 && !commentsOpen && (
        <button
          onClick={() => setCommentsOpen(true)}
          className="px-3 pb-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          View all {commentCount} comment{commentCount !== 1 ? 's' : ''}
        </button>
      )}

      <AnimatePresence>
        {commentsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden px-3 pb-2"
          >
            <CommentSection postId={post.id} authorId={post.author_id} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Timestamp ── */}
      <p className="px-3 pb-3 text-[11px] text-gray-400 uppercase tracking-wide">
        {formatRelativeTime(post.created_at)}
      </p>

      {encourageOpen && (
        <EncouragementBadgeModal
          postId={post.id}
          toUserId={post.author_id}
          onClose={() => setEncourageOpen(false)}
        />
      )}
    </article>
  )
}

function daysRemaining(endDate) {
  const diff = Math.ceil((new Date(endDate) - new Date()) / 86400000)
  if (diff < 0) return 'Ended'
  if (diff === 0) return 'Last day!'
  return `${diff}d left`
}

function PostMenu({ isOwn, isAdmin, isPinned, onEdit, onDelete, onReport, onPin, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <motion.div
        className="absolute right-0 top-8 z-20 bg-white border border-gray-100 rounded-2xl shadow-lg py-1 min-w-40 overflow-hidden"
        initial={{ scale: 0.88, opacity: 0, y: -4 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: -4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        {isAdmin && (
          <MenuItem icon={<Pin size={14} />} label={isPinned ? 'Unpin' : 'Pin'} onClick={onPin} />
        )}
        {isOwn ? (
          <>
            <MenuItem icon={<Pencil size={14} />} label="Edit" onClick={onEdit} />
            <MenuItem icon={<Trash2 size={14} />} label="Delete" onClick={onDelete} danger />
          </>
        ) : (
          <MenuItem icon={<Flag size={14} />} label="Report" onClick={onReport} danger />
        )}
      </motion.div>
    </>
  )
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors hover:bg-gray-50 ${
        danger ? 'text-red-500' : 'text-gray-800'
      }`}
    >
      {icon}{label}
    </button>
  )
}

function EncouragementSummary({ badges }) {
  const counts = badges.reduce((acc, b) => {
    const emoji = b.badge_type === 'you_got_this' ? '💪' : b.badge_type === 'proud_of_you' ? '🌟' : '🔥'
    acc[emoji] = (acc[emoji] || 0) + 1
    return acc
  }, {})
  return (
    <div className="flex items-center gap-1.5">
      {Object.entries(counts).map(([emoji, count]) => (
        <span key={emoji} className="text-xs text-gray-500">
          {emoji} {count}
        </span>
      ))}
    </div>
  )
}
