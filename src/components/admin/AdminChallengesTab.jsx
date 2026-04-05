import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Trash2 } from 'lucide-react'

const BLANK = { title: '', description: '', start_date: '', end_date: '' }

export default function AdminChallengesTab() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    supabase
      .from('challenges')
      .select('id, title, description, start_date, end_date, status, challenge_members(user_id)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setChallenges(data || [])
        setLoading(false)
      })
  }, [])

  async function createChallenge(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('challenges')
      .insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: 'active',
      })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      setChallenges((prev) => [{ ...data, challenge_members: [] }, ...prev])
      setForm(BLANK)
    }
  }

  async function remove(id) {
    if (!confirm('Delete this challenge? This cannot be undone.')) return
    setRemoving(id)
    await supabase.from('challenges').delete().eq('id', id)
    setChallenges((prev) => prev.filter((c) => c.id !== id))
    setRemoving(null)
  }

  async function toggleArchive(challenge) {
    const newStatus = challenge.status === 'active' ? 'archived' : 'active'
    await supabase.from('challenges').update({ status: newStatus }).eq('id', challenge.id)
    setChallenges((prev) =>
      prev.map((c) => (c.id === challenge.id ? { ...c, status: newStatus } : c)),
    )
  }

  return (
    <div>
      {/* Create form */}
      <form onSubmit={createChallenge} className="px-4 py-4 border-b border-gray-100 space-y-3">
        <p className="text-sm font-bold text-gray-900">New Challenge</p>
        <Input
          placeholder="Challenge title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <Input
          textarea
          placeholder="Description (optional)"
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="flex gap-2">
          <Input
            type="date"
            label="Start"
            value={form.start_date}
            onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
          />
          <Input
            type="date"
            label="End"
            value={form.end_date}
            onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
          />
        </div>
        <Button type="submit" loading={saving} size="sm">
          <Plus size={14} /> Create Challenge
        </Button>
      </form>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {challenges.map((c) => (
            <li key={c.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{c.title}</p>
                  <p className="text-xs text-gray-400">
                    {c.challenge_members?.length ?? 0} members ·{' '}
                    <span className={c.status === 'archived' ? 'text-gray-400' : 'text-green-600'}>
                      {c.status}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleArchive(c)}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100 transition"
                  >
                    {c.status === 'active' ? 'Archive' : 'Restore'}
                  </button>
                  <Button variant="danger" size="sm" loading={removing === c.id} onClick={() => remove(c.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
