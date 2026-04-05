import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { Search, UserX } from 'lucide-react'

export default function AdminMembersTab() {
  const [members, setMembers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, role, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMembers(data || [])
        setFiltered(data || [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const q = query.toLowerCase()
    setFiltered(
      q
        ? members.filter(
            (m) =>
              m.display_name?.toLowerCase().includes(q) ||
              m.username?.toLowerCase().includes(q),
          )
        : members,
    )
  }, [query, members])

  async function removeMember(member) {
    if (!confirm(`Remove ${member.display_name} from FNM Pulse? This cannot be undone.`)) return
    setRemoving(member.id)
    await supabase.rpc('admin_remove_member', { target_user_id: member.id })
    setMembers((prev) => prev.filter((m) => m.id !== member.id))
    setRemoving(null)
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Search size={16} className="text-gray-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members…"
          className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
        />
      </div>

      <p className="text-xs text-gray-400 px-4 py-2">{filtered.length} member{filtered.length !== 1 ? 's' : ''}</p>

      <ul>
        {filtered.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Avatar src={m.avatar_url} name={m.display_name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{m.display_name}</p>
              <p className="text-xs text-gray-400">@{m.username}</p>
            </div>
            {m.role === 'admin' ? (
              <span className="text-xs font-bold text-brand-pink bg-brand-light px-2 py-0.5 rounded-full">Admin</span>
            ) : (
              <Button
                variant="danger"
                size="sm"
                loading={removing === m.id}
                onClick={() => removeMember(m)}
              >
                <UserX size={13} />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
