import { useState, useEffect, useCallback } from 'react'
import { useOutletContext, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import logo from '@/assets/logo.png'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import PostCard from '@/components/feed/PostCard'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { StaggerList, StaggerItem, FadeIn } from '@/components/ui/Motion'
import { Plus, Bell } from 'lucide-react'

const PAGE_SIZE = 20

const POST_SELECT = `
  *,
  author:profiles!author_id(id, display_name, avatar_url, username),
  reactions(id, user_id, emoji),
  comments(id),
  encouragement_badges(id, badge_type, from_user_id),
  goals(id, title, end_date, status, goal_members(user_id))
`

export default function FeedPage() {
  const { user } = useAuth()
  const { refreshKey, openComposer } = useOutletContext()

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  useEffect(() => {
    if (!user) return
    async function fetchCount() {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadNotifs(count || 0)
    }
    fetchCount()
    const channel = supabase
      .channel('feed-notif-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchCount())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const fetchPosts = useCallback(async (reset = true) => {
    reset ? setLoading(true) : setLoadingMore(true)
    setError(null)

    const from = reset ? 0 : posts.length
    const to = from + PAGE_SIZE - 1

    const { data, error: err } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (err) {
      setError('Could not load posts. Please try again.')
    } else {
      const newPosts = data || []
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts])
      setHasMore(newPosts.length === PAGE_SIZE)
    }
    reset ? setLoading(false) : setLoadingMore(false)
  }, [posts.length])

  useEffect(() => { fetchPosts(true) }, [refreshKey])


  useEffect(() => {
    const channel = supabase
      .channel('feed-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        if (payload.new.author_id === user?.id) return
        const { data } = await supabase.from('posts').select(POST_SELECT).eq('id', payload.new.id).single()
        if (data) setPosts(prev => [data, ...prev])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id])

  function handleDeleted(postId) { setPosts(prev => prev.filter(p => p.id !== postId)) }
  function handleUpdated(p) { setPosts(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x)) }

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.button
            onClick={openComposer}
            className="w-9 h-9 flex items-center justify-center text-brand-pink transition"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            whileTap={{ scale: 0.9 }}
          >
            <Plus size={20} strokeWidth={1.8} />
          </motion.button>
          <img src={logo} alt="The Fit Nurse Movement" className="h-[22px]" />
          <NavLink to="/notifications"
            className="relative w-9 h-9 flex items-center justify-center text-gray-900 hover:text-brand-pink transition">
            <Bell size={20} strokeWidth={1.8} />
            {unreadNotifs > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                {unreadNotifs > 99 ? '99+' : unreadNotifs}
              </span>
            )}
          </NavLink>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
          <p className="text-gray-400 text-sm">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => fetchPosts(true)}>Try Again</Button>
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed onPost={openComposer} />
      ) : (
        <div className="pt-2 pb-4">
          <StaggerList>
            {posts.map(post => (
              <StaggerItem key={post.id}>
                <PostCard post={post} onDeleted={handleDeleted} onUpdated={handleUpdated} />
              </StaggerItem>
            ))}
          </StaggerList>
          {hasMore && (
            <div className="flex justify-center py-6">
              <Button variant="ghost" size="sm" loading={loadingMore} onClick={() => fetchPosts(false)}>
                Load more
              </Button>
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-center text-xs text-gray-300 py-8 font-medium">
              You&apos;re all caught up ✨
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyFeed({ onPost }) {
  return (
    <FadeIn className="flex flex-col items-center gap-5 py-20 px-8 text-center">
      <div className="w-20 h-20 rounded-full bg-brand-gradient flex items-center justify-center text-3xl shadow-glow">
        💪
      </div>
      <div>
        <h2 className="font-display text-2xl font-black text-gray-900 italic mb-2">Wide open!</h2>
        <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
          Be the first to post. Share a win, a goal, a struggle — this community has your back.
        </p>
      </div>
      <Button onClick={onPost} size="lg">Make the First Post 🔥</Button>
    </FadeIn>
  )
}
