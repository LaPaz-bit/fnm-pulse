import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LinkPreview from './LinkPreview'
import { Image, X, Target, Trophy, Loader2, CalendarDays } from 'lucide-react'
import { extractFirstUrl, fetchLinkPreview } from '@/utils/linkPreview'
import { onPostCreated } from '@/utils/badges'
import { useToast } from '@/context/ToastContext'

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  angle: (i / 12) * 360,
  distance: 40 + Math.random() * 40,
}))

function WinBurst({ active }) {
  return (
    <AnimatePresence>
      {active && PARTICLES.map(p => {
        const rad = (p.angle * Math.PI) / 180
        return (
          <motion.span
            key={p.id}
            className="absolute pointer-events-none text-[10px] z-10"
            style={{ top: '50%', left: '50%' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(rad) * p.distance,
              y: Math.sin(rad) * p.distance,
              opacity: 0,
              scale: 0.5,
            }}
            exit={{}}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            ⭐
          </motion.span>
        )
      })}
    </AnimatePresence>
  )
}

export default function PostComposer({ onClose, onCreated }) {
  const { user, profile } = useAuth()
  const { addToast } = useToast()
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [isGoalProposal, setIsGoalProposal] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalEndDate, setGoalEndDate] = useState('')
  const [isWin, setIsWin] = useState(false)
  const [winBurstKey, setWinBurstKey] = useState(null)
  const [linkPreview, setLinkPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewDismissed, setPreviewDismissed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const textareaRef = useRef(null)
  const previewUrlRef = useRef(null)

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [content])

  useEffect(() => {
    if (previewDismissed) return
    const url = extractFirstUrl(content)
    if (!url || url === previewUrlRef.current) return
    previewUrlRef.current = url
    setPreviewLoading(true)
    setLinkPreview(null)
    const timer = setTimeout(async () => {
      const data = await fetchLinkPreview(url)
      setLinkPreview(data)
      setPreviewLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [content, previewDismissed])

  function handleMedia(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  function removeMedia() {
    setMediaFile(null)
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaPreview(null)
  }

  async function submit() {
    if (!content.trim() || !user) return
    if (isGoalProposal && !goalTitle.trim()) {
      setError('Please give your goal a title.')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      let mediaUrl = null
      if (mediaFile) {
        const ext = mediaFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(path, mediaFile, { upsert: false })
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage
          .from('post-media')
          .getPublicUrl(path)
        mediaUrl = publicUrl
      }

      // Create the post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id:        user.id,
          content:          content.trim(),
          media_urls:       mediaUrl ? [mediaUrl] : [],
          is_goal_proposal: isGoalProposal,
          is_win:           isWin,
          post_type:        isWin ? 'win' : 'general',
          link_preview:     linkPreview || null,
        })
        .select()
        .single()
      if (postError) throw postError

      // If goal proposal, create the goals record linked to this post
      if (isGoalProposal && goalTitle.trim()) {
        const { error: goalError } = await supabase.from('goals').insert({
          owner_id:   user.id,
          title:      goalTitle.trim(),
          description: content.trim(),
          goal_type:  'group',
          status:     'active',
          post_id:    post.id,
          end_date:   goalEndDate || null,
        })
        if (goalError) {
          console.error('Goal creation error:', goalError)
          addToast({ emoji: '⚠️', message: 'Post created, but the goal could not be saved.', sub: 'Try creating the goal again.' })
        }
      }

      // Check milestone badges
      const awarded = await onPostCreated(user.id, isWin)
      awarded.forEach(b => addToast({ emoji: b.emoji, message: `Badge Earned: ${b.label}!`, sub: b.description }))

      onCreated?.()
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
      setSubmitting(false)
    }
  }

  const canPost = content.trim().length > 0 && (!isGoalProposal || goalTitle.trim().length > 0)

  return (
    <div className="fixed inset-0 bottom-[calc(52px+max(env(safe-area-inset-bottom),8px))] z-50 flex flex-col bg-white max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
        >
          <X size={20} />
        </button>
<Button variant="secondary" size="sm" disabled={!canPost} loading={submitting} onClick={submit}>
          Post
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
        <div className="px-3 py-3">
            <div className="flex gap-3">
              <Avatar src={profile?.avatar_url} name={profile?.display_name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 mb-2">
                  {profile?.display_name || 'You'}
                </p>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="What's on your mind? Share a win, a struggle, a goal — the FNM Community is here for it all 💪"
                  className="w-full text-base text-gray-900 placeholder:text-gray-400 outline-none resize-none leading-relaxed min-h-[120px] bg-transparent"
                  maxLength={2000}
                />

                {/* Photo + word count row */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <label className="flex items-center gap-1.5 text-brand-pink cursor-pointer hover:text-brand-dark transition-colors">
                    <Image size={18} />
                    <span className="text-sm font-medium">Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleMedia} />
                  </label>
                  <span className="text-xs text-gray-300">{content.length}/2000</span>
                </div>

                {/* Media preview */}
                {mediaPreview && (
                  <div className="relative mt-3 rounded-2xl overflow-hidden">
                    <img src={mediaPreview} alt="Preview" className="w-full max-h-64 object-cover" />
                    <button
                      onClick={removeMedia}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Link preview */}
                {previewLoading && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                    <Loader2 size={13} className="animate-spin" />
                    Loading preview…
                  </div>
                )}
                {linkPreview && !previewLoading && (
                  <div className="relative mt-1">
                    <button
                      onClick={() => { setLinkPreview(null); setPreviewDismissed(true) }}
                      className="absolute -top-1 -right-1 z-10 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                    <LinkPreview preview={linkPreview} />
                  </div>
                )}

                {/* Toggles */}
                <div className="flex flex-col gap-2 mt-4">
                  <Toggle
                    icon={<Target size={16} />}
                    label="Goal Proposal"
                    sublabel="Let others join with &quot;I'm in!&quot;"
                    active={isGoalProposal}
                    onToggle={() => setIsGoalProposal(v => !v)}
                  />
                  <div className="relative overflow-visible">
                    <WinBurst active={winBurstKey !== null} key={winBurstKey} />
                    <Toggle
                      icon={<Trophy size={16} />}
                      label="Add to Wins Wall"
                      sublabel="Celebrate this moment 🎉"
                      active={isWin}
                      onToggle={() => {
                        const newVal = !isWin
                        setIsWin(newVal)
                        if (newVal) setWinBurstKey(Date.now())
                      }}
                    />
                  </div>
                </div>

                {/* Goal Proposal extra fields */}
                {isGoalProposal && (
                  <div className="mt-3 flex flex-col gap-3 p-3 bg-brand-light rounded-xl border border-brand-soft">
                    <Input
                      label="Goal Title *"
                      value={goalTitle}
                      onChange={e => setGoalTitle(e.target.value)}
                      placeholder="e.g. 10k steps every day this week"
                      maxLength={100}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <CalendarDays size={14} />
                        End Date (optional)
                      </label>
                      <input
                        type="date"
                        value={goalEndDate}
                        onChange={e => setGoalEndDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-light"
                      />
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
              </div>
            </div>
          </div>
      </div>
    </div>
  )
}

function Toggle({ icon, label, sublabel, active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={[
        'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
        active ? 'border-brand-pink bg-brand-light' : 'border-gray-100 hover:border-gray-200',
      ].join(' ')}
    >
      <span className={active ? 'text-brand-pink' : 'text-gray-400'}>{icon}</span>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${active ? 'text-brand-dark' : 'text-gray-700'}`}>
          {label}
        </p>
        <p className="text-xs text-gray-400">{sublabel}</p>
      </div>
      <div className={[
        'w-10 h-6 rounded-full transition-colors relative',
        active ? 'bg-brand-pink' : 'bg-gray-200',
      ].join(' ')}>
        <span className={[
          'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
          active ? 'translate-x-5' : 'translate-x-1',
        ].join(' ')} />
      </div>
    </button>
  )
}
