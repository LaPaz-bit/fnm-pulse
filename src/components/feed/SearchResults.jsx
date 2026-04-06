import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/ui/Avatar'
import PostCard from './PostCard'
import Spinner from '@/components/ui/Spinner'
import { User, FileText } from 'lucide-react'

export default function SearchResults({ query }) {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setPosts([])
      setMembers([])
      return
    }
    const timer = setTimeout(() => search(query.trim()), 350)
    return () => clearTimeout(timer)
  }, [query])

  async function search(q) {
    setLoading(true)
    const pattern = `%${q}%`

    const [postsRes, membersRes] = await Promise.all([
      supabase
        .from('posts')
        .select(`
          *,
          author:profiles!author_id(id, display_name, avatar_url, username),
          reactions(id, user_id, emoji),
          comments(id),
          encouragement_badges(id, badge_type, from_user_id),
          goals(id, title, end_date, status, goal_members(user_id))
        `)
        .ilike('content', pattern)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username, bio')
        .ilike('display_name', pattern)
        .limit(10),
    ])

    setPosts(postsRes.data || [])
    setMembers(membersRes.data || [])
    setLoading(false)
  }

  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
        <p className="text-2xl">🔍</p>
        <p className="text-gray-400 text-sm">Search posts or find members by name</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  const empty = posts.length === 0 && members.length === 0

  return (
    <div>
      {empty ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
          <p className="text-2xl">😔</p>
          <p className="text-gray-900 font-bold">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-gray-400 text-sm">Try a different keyword or name</p>
        </div>
      ) : (
        <>
          {/* Members section */}
          {members.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <User size={14} className="text-brand-pink" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Members</span>
              </div>
              {members.map(member => (
                <button
                  key={member.id}
                  onClick={() => navigate(`/profile/${member.id}`)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                >
                  <Avatar src={member.avatar_url} name={member.display_name} size="md" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-bold text-sm text-gray-900">{member.display_name}</p>
                    <p className="text-xs text-gray-400">@{member.username}</p>
                    {member.bio && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{member.bio}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Posts section */}
          {posts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <FileText size={14} className="text-brand-pink" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Posts ({posts.length})
                </span>
              </div>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
                  onUpdated={(p) => setPosts(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
