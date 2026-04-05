import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { formatRelativeTime } from '@/utils/formatDate'
import { Trash2 } from 'lucide-react'

export default function AdminGoalsTab() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    supabase
      .from('goals')
      .select(`
        id, title, status, created_at,
        creator:profiles!creator_id(id, display_name, username, avatar_url),
        goal_members(user_id)
      `)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setGoals(data || [])
        setLoading(false)
      })
  }, [])

  async function remove(goal) {
    if (!confirm(`Delete goal "${goal.title}"? This cannot be undone.`)) return
    setRemoving(goal.id)
    await supabase.from('goals').delete().eq('id', goal.id)
    setGoals((prev) => prev.filter((g) => g.id !== goal.id))
    setRemoving(null)
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <ul className="divide-y divide-gray-100">
      {goals.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-12">No goals yet.</p>
      )}
      {goals.map((g) => (
        <li key={g.id} className="px-4 py-3 flex items-start gap-3">
          <Avatar src={g.creator?.avatar_url} name={g.creator?.display_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{g.title}</p>
            <p className="text-xs text-gray-400">
              @{g.creator?.username} · {g.goal_members?.length ?? 0} members ·{' '}
              {formatRelativeTime(g.created_at)}
            </p>
            <span
              className={[
                'inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                g.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : g.status === 'completed'
                  ? 'bg-brand-light text-brand-dark'
                  : 'bg-gray-100 text-gray-500',
              ].join(' ')}
            >
              {g.status}
            </span>
          </div>
          <Button
            variant="danger"
            size="sm"
            loading={removing === g.id}
            onClick={() => remove(g)}
          >
            <Trash2 size={13} />
          </Button>
        </li>
      ))}
    </ul>
  )
}
