import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import AdminMembersTab from '@/components/admin/AdminMembersTab'
import AdminReportsTab from '@/components/admin/AdminReportsTab'
import AdminChallengesTab from '@/components/admin/AdminChallengesTab'
import AdminGoalsTab from '@/components/admin/AdminGoalsTab'
import { ArrowLeft, Pin, PinOff, Mail, BookOpen } from 'lucide-react'

const TABS = ['Members', 'Reports', 'Challenges', 'Goals']

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Members')
  const [stats, setStats] = useState(null)
  const [guidelines, setGuidelines] = useState('')
  const [guidelinesSaving, setGuidelinesSaving] = useState(false)
  const [pinnedPosts, setPinnedPosts] = useState([])

  useEffect(() => {
    supabase.rpc('get_admin_stats').then(({ data }) => setStats(data))

    supabase
      .from('community_guidelines')
      .select('content')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setGuidelines(data?.content || ''))

    supabase
      .from('posts')
      .select('id, content, is_pinned, author:profiles!author_id(display_name)')
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPinnedPosts(data || []))
  }, [])

  async function saveGuidelines() {
    setGuidelinesSaving(true)
    // Upsert: delete old row and insert fresh (single-row table pattern)
    await supabase.from('community_guidelines').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('community_guidelines').insert({ content: guidelines, updated_by: user?.id })
    setGuidelinesSaving(false)
  }

  async function togglePin(post) {
    const newVal = !post.is_pinned
    await supabase.from('posts').update({ is_pinned: newVal }).eq('id', post.id)
    if (!newVal) {
      setPinnedPosts((prev) => prev.filter((p) => p.id !== post.id))
    }
  }

  async function emailMembers() {
    const { data } = await supabase.rpc('get_member_emails')
    if (!data?.length) return
    const emails = data.map((r) => r.email).join(',')
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails)}`
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-lg font-black text-gray-900">Admin Panel</span>
      </header>

      {/* Stats strip */}
      {stats && (
        <div className="flex overflow-x-auto gap-3 px-4 py-3 border-b border-gray-100 no-scrollbar">
          {[
            ['Members', stats.total_members],
            ['Posts', stats.total_posts],
            ['Goals', stats.total_goals],
            ['Challenges', stats.total_challenges],
            ['Wins', stats.total_wins],
            ['Reports', stats.open_reports],
            ['New (7d)', stats.new_members_7d],
          ].map(([label, val]) => (
            <div
              key={label}
              className="shrink-0 bg-gray-50 rounded-xl px-3 py-2 text-center min-w-[64px]"
            >
              <p className="text-lg font-black text-gray-900">{val}</p>
              <p className="text-[10px] text-gray-400 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 px-4 py-3 border-b border-gray-100">
        <button
          onClick={emailMembers}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-full transition"
        >
          <Mail size={13} /> Email all members
        </button>
        <button
          onClick={() => navigate('/guidelines')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-full transition"
        >
          <BookOpen size={13} /> View guidelines
        </button>
      </div>

      {/* Guidelines editor */}
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-900 mb-2">Community Guidelines</p>
        <textarea
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          rows={4}
          className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl p-3 outline-none resize-none focus:ring-2 focus:ring-brand-light"
        />
        <div className="flex justify-end mt-2">
          <Button size="sm" loading={guidelinesSaving} onClick={saveGuidelines}>
            Save Guidelines
          </Button>
        </div>
      </div>

      {/* Pinned posts */}
      {pinnedPosts.length > 0 && (
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900 mb-2">Pinned Posts</p>
          <ul className="space-y-2">
            {pinnedPosts.map((p) => (
              <li key={p.id} className="flex items-start gap-2 bg-brand-light/40 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">by {p.author?.display_name}</p>
                  <p className="text-sm text-gray-800 line-clamp-2">{p.content}</p>
                </div>
                <button
                  onClick={() => togglePin(p)}
                  className="shrink-0 text-brand-pink hover:text-brand-dark transition"
                  title="Unpin"
                >
                  <PinOff size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-gray-100 sticky top-[57px] bg-white z-20">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 py-2.5 text-xs font-semibold transition',
              tab === t ? 'text-brand-pink border-b-2 border-brand-pink' : 'text-gray-400',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Members'    && <AdminMembersTab />}
      {tab === 'Reports'    && <AdminReportsTab />}
      {tab === 'Challenges' && <AdminChallengesTab />}
      {tab === 'Goals'      && <AdminGoalsTab />}
    </div>
  )
}
