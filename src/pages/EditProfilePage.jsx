import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Avatar from '@/components/ui/Avatar'
import { ArrowLeft, Camera } from 'lucide-react'

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function save() {
    if (!displayName.trim()) {
      setError('Display name is required.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      let avatarUrl = profile?.avatar_url || null

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = `${publicUrl}?t=${Date.now()}`
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio:          bio.trim() || null,
          avatar_url:   avatarUrl,
          updated_at:   new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) throw updateError
      await refreshProfile()
      navigate('/profile', { replace: true })
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-lg font-black text-gray-900 italic">Edit Profile</h1>
      </header>

      <div className="px-5 py-6 flex flex-col gap-6 max-w-lg mx-auto">
        {/* Avatar */}
        <div className="flex justify-center">
          <label className="relative cursor-pointer group">
            <Avatar
              src={avatarPreview}
              name={displayName || 'You'}
              size="xl"
              className="ring-4 ring-brand-soft"
            />
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={22} color="white" />
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-brand-pink rounded-full flex items-center justify-center border-2 border-white">
              <Camera size={14} color="white" />
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
        </div>

        <Input
          label="Display Name *"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          maxLength={50}
        />

        <Input
          label="Bio"
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Tell the community about yourself"
          textarea
          rows={3}
          maxLength={200}
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button fullWidth loading={loading} onClick={save}>
          Save Changes
        </Button>
      </div>
    </div>
  )
}
