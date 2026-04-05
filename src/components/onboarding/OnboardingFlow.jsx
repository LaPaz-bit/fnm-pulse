import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Avatar from '@/components/ui/Avatar'
import { Camera, ArrowRight, Sparkles } from 'lucide-react'

const TOTAL_STEPS = 3

export default function OnboardingFlow() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [introPost, setIntroPost] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function finish(skipIntro = false) {
    if (!displayName.trim()) {
      setError('Please enter a display name.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      let avatarUrl = profile?.avatar_url || null

      // Upload avatar if provided
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = publicUrl
      }

      // Update profile
      await supabase.from('profiles').update({
        display_name:         displayName.trim(),
        bio:                  bio.trim() || null,
        avatar_url:           avatarUrl,
        onboarding_completed: true,
        updated_at:           new Date().toISOString(),
      }).eq('id', user.id)

      // Create intro post if provided
      if (!skipIntro && introPost.trim()) {
        await supabase.from('posts').insert({
          author_id: user.id,
          content:   introPost.trim(),
          post_type: 'general',
        })
      }

      await refreshProfile()
      navigate('/', { replace: true })
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <span className="text-3xl font-black text-brand-pink">FNM Pulse</span>

        {/* Progress dots */}
        <div className="flex gap-2 mt-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={[
                'h-1.5 rounded-full flex-1 transition-all',
                i + 1 <= step ? 'bg-brand-pink' : 'bg-gray-200',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 pb-8">
        {step === 1 && (
          <Step1
            avatarPreview={avatarPreview}
            displayName={displayName}
            onAvatarChange={handleAvatarChange}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2
            displayName={displayName}
            bio={bio}
            error={error}
            onDisplayNameChange={setDisplayName}
            onBioChange={setBio}
            onNext={() => { setError(null); setStep(3) }}
          />
        )}
        {step === 3 && (
          <Step3
            introPost={introPost}
            loading={loading}
            error={error}
            onIntroPostChange={setIntroPost}
            onPost={() => finish(false)}
            onSkip={() => finish(true)}
          />
        )}
      </div>
    </div>
  )
}

function Step1({ avatarPreview, displayName, onAvatarChange, onNext }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="mt-4">
        <h1 className="text-2xl font-black text-gray-900">Welcome to the FNM Community! 🎉</h1>
        <p className="text-gray-500 mt-2">
          Let's set up your profile so your people can find you.
        </p>
      </div>

      {/* Avatar upload */}
      <label className="relative cursor-pointer group">
        <Avatar
          src={avatarPreview}
          name={displayName || 'You'}
          size="xl"
          className="ring-4 ring-brand-soft"
        />
        <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Camera size={24} color="white" />
        </div>
        <div className="absolute bottom-0 right-0 w-9 h-9 bg-brand-pink rounded-full flex items-center justify-center border-2 border-white">
          <Camera size={16} color="white" />
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onAvatarChange}
        />
      </label>
      <p className="text-sm text-gray-400">Tap to add a profile photo (optional)</p>

      <Button fullWidth size="lg" onClick={onNext} className="mt-4">
        Continue <ArrowRight size={18} />
      </Button>
    </div>
  )
}

function Step2({ displayName, bio, error, onDisplayNameChange, onBioChange, onNext }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Tell us about you</h1>
        <p className="text-gray-500 mt-1">How should the community know you?</p>
      </div>

      <Input
        label="Display Name *"
        value={displayName}
        onChange={e => onDisplayNameChange(e.target.value)}
        placeholder="e.g. Jamie, Coach Sam, The Real MVP..."
        maxLength={50}
      />

      <Input
        label="Bio (optional)"
        value={bio}
        onChange={e => onBioChange(e.target.value)}
        placeholder="What drives you? What are you working on?"
        textarea
        rows={3}
        maxLength={200}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        fullWidth
        size="lg"
        disabled={!displayName.trim()}
        onClick={onNext}
      >
        Continue <ArrowRight size={18} />
      </Button>
    </div>
  )
}

function Step3({ introPost, loading, error, onIntroPostChange, onPost, onSkip }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Say hello! 👋</h1>
        <p className="text-gray-500 mt-1">
          Introduce yourself to the FNM Community. Let them know you've arrived!
        </p>
      </div>

      <div className="rounded-2xl border-2 border-brand-soft bg-brand-light/30 p-4">
        <p className="text-xs font-semibold text-brand-pink mb-2 uppercase tracking-wide">
          <Sparkles size={11} className="inline mr-1" />
          Intro Post
        </p>
        <textarea
          value={introPost}
          onChange={e => onIntroPostChange(e.target.value)}
          placeholder="Hey FNM Community! I'm [name] and I'm here to... 🔥"
          className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none resize-none leading-relaxed"
          rows={5}
          maxLength={500}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        fullWidth
        size="lg"
        loading={loading}
        disabled={!introPost.trim() || loading}
        onClick={onPost}
      >
        Post & Enter the Community 🚀
      </Button>
      <button
        onClick={onSkip}
        disabled={loading}
        className="text-sm text-gray-400 hover:text-gray-600 text-center transition-colors"
      >
        Skip for now
      </button>
    </div>
  )
}
