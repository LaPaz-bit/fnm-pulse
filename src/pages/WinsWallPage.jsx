import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOutletContext } from 'react-router-dom'
import PostCard from '@/components/feed/PostCard'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { Trophy } from 'lucide-react'

const PAGE_SIZE = 20
const POST_SELECT = `
  *,
  author:profiles!author_id(id, display_name, avatar_url, username),
  reactions(id, user_id, emoji),
  comments(id),
  encouragement_badges(id, badge_type, from_user_id),
  goals(id, title, end_date, status, goal_members(user_id))
`

export default function WinsWallPage() {
  const { openComposer } = useOutletContext()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)

  const fetchPosts = useCallback(async (reset = true) => {
    reset ? setLoading(true) : setLoadingMore(true)
    setError(null)
    const from = reset ? 0 : posts.length
    const to = from + PAGE_SIZE - 1
    const { data, error: err } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('is_win', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (err) setError('Could not load wins.')
    else {
      const p = data || []
      setPosts(prev => reset ? p : [...prev, ...p])
      setHasMore(p.length === PAGE_SIZE)
    }
    reset ? setLoading(false) : setLoadingMore(false)
  }, [posts.length])

  useEffect(() => { fetchPosts(true) }, [])

  function handleDeleted(id) { setPosts(prev => prev.filter(p => p.id !== id)) }
  function handleUpdated(p) { setPosts(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x)) }

  return (
    <div>
      {/* Hero header */}
      <header className="relative overflow-hidden bg-brand-gradient px-5 pt-8 pb-7">
        {/* Decorative blobs */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-4 w-24 h-24 rounded-full bg-white/8" />

        <div className="relative flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={20} className="text-white" strokeWidth={2.5} />
              <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Wall of Fame</span>
            </div>
            <h1 className="font-display text-4xl font-black text-white italic leading-none">
              Wins Wall
            </h1>
          </div>
          <div className="text-4xl mb-1">🎉</div>
        </div>
        <p className="relative text-sm text-white/70 font-medium mt-2.5">
          Every win counts. Big or small — celebrate them all.
        </p>
      </header>

      {/* Gradient fade edge */}
      <div className="h-1.5 bg-gradient-to-r from-brand-pink via-brand-soft to-transparent opacity-50" />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
          <p className="text-gray-400 text-sm">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => fetchPosts(true)}>Try Again</Button>
        </div>
      ) : posts.length === 0 ? (
        <EmptyWins onPost={openComposer} />
      ) : (
        <div className="pt-2 pb-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} onDeleted={handleDeleted} onUpdated={handleUpdated} />
          ))}
          {hasMore && (
            <div className="flex justify-center py-6">
              <Button variant="ghost" size="sm" loading={loadingMore} onClick={() => fetchPosts(false)}>
                Load more
              </Button>
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-center text-xs text-gray-300 py-8 font-medium">
              Every single one of these is a W. 🏆
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyWins({ onPost }) {
  return (
    <div className="flex flex-col items-center gap-5 py-20 px-8 text-center animate-fade-up">
      <div className="w-20 h-20 rounded-full bg-brand-gradient flex items-center justify-center text-3xl shadow-glow">
        🏆
      </div>
      <div>
        <h2 className="font-display text-2xl font-black text-gray-900 italic mb-2">No wins yet!</h2>
        <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
          Got a win to share — big or small? Post it and toggle the Wins Wall flag.
        </p>
      </div>
      <Button onClick={onPost} size="lg">Share Your Win 🎉</Button>
    </div>
  )
}
