import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { formatRelativeTime } from '@/utils/formatDate'
import { CheckCircle, Trash2 } from 'lucide-react'

const PAGE_SIZE = 50

export default function AdminReportsTab() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('reported_posts')
      .select(`
        id, reason, status, created_at,
        reporter:profiles!reporter_id(id, display_name, avatar_url, username),
        post:posts!target_id(id, content, author_id, author:profiles!author_id(display_name, username))
      `)
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
      .then(({ data }) => {
        setReports(data || [])
        setHasMore((data || []).length === PAGE_SIZE)
        setLoading(false)
      })
  }, [filter])

  async function loadMore() {
    const { data } = await supabase
      .from('reported_posts')
      .select(`
        id, reason, status, created_at,
        reporter:profiles!reporter_id(id, display_name, avatar_url, username),
        post:posts!target_id(id, content, author_id, author:profiles!author_id(display_name, username))
      `)
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .range(reports.length, reports.length + PAGE_SIZE - 1)
    const newRows = data || []
    setReports(prev => [...prev, ...newRows])
    setHasMore(newRows.length === PAGE_SIZE)
  }

  async function dismiss(reportId) {
    await supabase.rpc('admin_dismiss_report', { report_id: reportId })
    setReports((prev) => prev.filter((r) => r.id !== reportId))
  }

  async function removePost(report) {
    if (!confirm('Delete this post? This cannot be undone.')) return
    await supabase.rpc('admin_remove_post', { p_post_id: report.post?.id })
    setReports((prev) => prev.filter((r) => r.id !== report.id))
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex border-b border-gray-100">
        {['open', 'dismissed', 'actioned'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={[
              'flex-1 py-2.5 text-xs font-semibold capitalize transition',
              filter === s ? 'text-brand-pink border-b-2 border-brand-pink' : 'text-gray-400',
            ].join(' ')}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : reports.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">No {filter} reports.</p>
      ) : (
        <div>
        <ul className="divide-y divide-gray-100">
          {reports.map((r) => (
            <li key={r.id} className="px-4 py-4">
              {/* Reporter */}
              <div className="flex items-center gap-2 mb-2">
                <Avatar src={r.reporter?.avatar_url} name={r.reporter?.display_name} size="xs" />
                <span className="text-xs text-gray-500">
                  <span className="font-semibold">{r.reporter?.display_name}</span> reported ·{' '}
                  {formatRelativeTime(r.created_at)}
                </span>
              </div>

              {/* Reported post */}
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                {r.post ? (
                  <>
                    <p className="text-xs text-gray-400 mb-1">
                      by @{r.post.author?.username}
                    </p>
                    <p className="text-sm text-gray-800 line-clamp-4">{r.post.content}</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 italic">Post no longer exists.</p>
                )}
              </div>

              {filter === 'open' && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => dismiss(r.id)}>
                    <CheckCircle size={13} />
                    Dismiss
                  </Button>
                  {r.post && (
                    <Button variant="danger" size="sm" onClick={() => removePost(r)}>
                      <Trash2 size={13} />
                      Remove Post
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        {hasMore && (
          <div className="flex justify-center py-4">
            <Button variant="ghost" size="sm" onClick={loadMore}>Load more</Button>
          </div>
        )}
        </div>
      )}
    </div>
  )
}
