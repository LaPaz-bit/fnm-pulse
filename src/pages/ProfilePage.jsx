import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import PostCard from '@/components/feed/PostCard'
import BadgeDisplay from '@/components/profile/BadgeDisplay'
import EditProfileModal from '@/components/profile/EditProfileModal'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { ArrowLeft, Plus, Pencil, Trophy, MessageCircle, Trash2, LogOut, Bell, BellOff, ShieldCheck, Grid3X3, MoreHorizontal } from 'lucide-react'

const POST_SELECT = `
  *,
  author:profiles!author_id(id, display_name, avatar_url, username),
  reactions(id, user_id, emoji),
  comments(id),
  encouragement_badges(id, badge_type, from_user_id),
  goals(id, title, end_date, status, goal_members(user_id))
`

export default function ProfilePage() {
  const { userId } = useParams()
  const { user, profile: ownProfile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { openComposer } = useOutletContext()

  const targetId = userId || user?.id
  const isOwn = targetId === user?.id

  const [profile, setProfile] = useState(isOwn ? ownProfile : null)
  const [stats, setStats] = useState(null)
  const [badges, setBadges] = useState([])
  const [posts, setPosts] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(!isOwn)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [gridView, setGridView] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const push = usePushNotifications()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!targetId) return
    fetchProfile()
    fetchStats()
    fetchBadges()
    fetchPosts()
  }, [targetId])

  useEffect(() => {
    if (isOwn && ownProfile) setProfile(ownProfile)
  }, [ownProfile, isOwn])

  async function fetchProfile() {
    if (isOwn) return
    setLoadingProfile(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', targetId).single()
    setProfile(data)
    setLoadingProfile(false)
  }

  async function fetchStats() {
    const { data } = await supabase.rpc('get_profile_stats', { target_user_id: targetId })
    if (data?.[0]) setStats(data[0])
  }

  async function fetchBadges() {
    const { data } = await supabase
      .from('member_badges')
      .select('*, badges(id, name, description)')
      .eq('user_id', targetId)
      .order('awarded_at', { ascending: false })
    setBadges(data || [])
  }

  async function fetchPosts() {
    setLoadingPosts(true)
    const { data } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('author_id', targetId)
      .order('created_at', { ascending: false })
      .limit(30)
    setPosts(data || [])
    setLoadingPosts(false)
  }

  async function handleDelete() {
    if (deleteInput !== 'DELETE') return
    setDeleting(true)
    await supabase.rpc('delete_my_account')
    await signOut()
    navigate('/login', { replace: true })
  }

  function handlePostDeleted(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  function handlePostUpdated(updatedPost) {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p))
  }

  if (loadingProfile && !isOwn) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
        <p className="text-gray-500">Member not found.</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  const postsWithMedia = posts.filter(p => p.media_urls?.some(url => url))
  const showGrid = gridView && postsWithMedia.length > 0

  return (
    <div>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="w-9">
          {userId ? (
            <button onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center text-gray-900 hover:text-brand-pink transition">
              <ArrowLeft size={22} strokeWidth={1.8} />
            </button>
          ) : (
            <button onClick={openComposer}
              className="w-9 h-9 flex items-center justify-center text-gray-900 hover:text-brand-pink transition">
              <Plus size={22} strokeWidth={1.8} />
            </button>
          )}
        </div>
        <span className="font-display text-2xl font-black text-gray-900 italic">
          {profile.username || profile.display_name || 'Profile'}
        </span>
        <div className="w-9 flex justify-end">
          {isOwn && (
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)}
                className="w-9 h-9 flex items-center justify-center text-gray-900 hover:text-brand-pink transition">
                <MoreHorizontal size={22} strokeWidth={1.8} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-20 bg-white border border-gray-100 rounded-2xl shadow-lg py-1 min-w-44 overflow-hidden">
                    {push.supported && (
                      <button
                        onClick={() => { push.subscribed ? push.unsubscribe() : push.subscribe(); setMenuOpen(false) }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
                      >
                        {push.subscribed ? <BellOff size={14} /> : <Bell size={14} />}
                        {push.subscribed ? 'Mute notifications' : 'Enable notifications'}
                      </button>
                    )}
                    {ownProfile?.role === 'admin' && (
                      <button onClick={() => { navigate('/admin'); setMenuOpen(false) }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 transition-colors">
                        <ShieldCheck size={14} /> Admin panel
                      </button>
                    )}
                    <button onClick={() => { navigate('/leaderboard'); setMenuOpen(false) }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 transition-colors">
                      <Trophy size={14} /> Leaderboard
                    </button>
                    <button onClick={signOut}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-gray-50 transition-colors">
                      <LogOut size={14} /> Log Out
                    </button>
                    <button onClick={() => { setDeleteConfirm(true); setMenuOpen(false) }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-gray-50 transition-colors">
                      <Trash2 size={14} /> Delete Account
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Profile info ── */}
      <div className="px-4 pt-5 pb-4">
        {/* Avatar + stats row */}
        <div className="flex items-center gap-6 mb-4">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name}
            size="xl"
            className="ring-2 ring-gray-100 shrink-0"
          />
          <div className="flex-1 flex justify-around">
            <StatCell value={stats?.post_count ?? 0} label="Posts" />
            <StatCell value={stats?.badges_earned ?? 0} label="Badges" />
            <StatCell value={stats?.goals_joined ?? 0} label="Goals" />
          </div>
        </div>

        {/* Name + bio */}
        <p className="font-bold text-sm text-gray-900 leading-tight mb-0.5">
          {profile.display_name || 'FNM Member'}
        </p>
        {profile.bio && (
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3.5">
          {isOwn ? (
            <button
              onClick={() => setEditOpen(true)}
              className="flex-1 py-2 text-sm font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Edit profile
            </button>
          ) : (
            <button
              onClick={() => navigate(`/messages/${profile.id}`)}
              className="flex-1 py-2 text-sm font-semibold text-brand-pink bg-brand-lightest border border-brand-pink hover:bg-brand-light rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <MessageCircle size={15} strokeWidth={2} /> Message
            </button>
          )}
        </div>
      </div>

      {/* ── Badges strip ── */}
      {badges.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <BadgeDisplay memberBadges={badges} />
        </div>
      )}

      {/* ── Posts tabs ── */}
      <div className="border-t border-gray-200 flex">
        <button
          onClick={() => setGridView(true)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-t-2 transition-colors ${
            gridView ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'
          }`}
        >
          <Grid3X3 size={14} /> Grid
        </button>
        <button
          onClick={() => setGridView(false)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-t-2 transition-colors ${
            !gridView ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'
          }`}
        >
          ☰ Posts
        </button>
      </div>

      {/* ── Posts content ── */}
      {loadingPosts ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
          <p className="text-3xl">✍️</p>
          <p className="text-sm text-gray-400">No posts yet.</p>
        </div>
      ) : showGrid ? (
        <div className="grid grid-cols-3 gap-px bg-gray-200">
          {postsWithMedia.map(post => (
            <button
              key={post.id}
              onClick={() => setGridView(false)}
              className="relative aspect-square overflow-hidden bg-gray-100"
            >
              <img
                src={post.media_urls[0]}
                alt=""
                className="w-full h-full object-cover"
              />
              {post.is_win && (
                <span className="absolute top-1 right-1 text-xs">🏆</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} onDeleted={handlePostDeleted} onUpdated={handlePostUpdated} />
        ))
      )}

      {/* ── Delete account confirmation modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm flex flex-col gap-3 p-5 rounded-3xl border border-red-200 bg-white shadow-lg animate-scale-in">
            <p className="text-sm font-bold text-red-700">This cannot be undone.</p>
            <p className="text-xs text-red-500 leading-relaxed">
              All your posts, comments, and data will be permanently deleted.
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full rounded-2xl border border-red-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-red-400"
            />
            <div className="flex gap-2">
              <Button variant="danger" size="sm" disabled={deleteInput !== 'DELETE'}
                loading={deleting} onClick={handleDelete} className="flex-1">
                Delete Account
              </Button>
              <Button variant="ghost" size="sm"
                onClick={() => { setDeleteConfirm(false); setDeleteInput('') }} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <EditProfileModal
          onClose={() => setEditOpen(false)}
          onSaved={() => { refreshProfile(); setEditOpen(false) }}
        />
      )}
    </div>
  )
}

function StatCell({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-bold text-lg text-gray-900 leading-tight">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}
