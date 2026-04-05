import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import { ArrowLeft, FileText, CheckCircle2, Heart, Zap } from 'lucide-react'

const TABS = [
  { key: 'posts',       label: 'Posts',    icon: FileText,      rpc: 'get_top_posters',     unit: 'posts' },
  { key: 'completed',   label: 'Finishers',icon: CheckCircle2,  rpc: 'get_top_completers',  unit: 'done' },
  { key: 'encouraging', label: 'Cheerful', icon: Heart,         rpc: 'get_top_encouragers', unit: 'given' },
  { key: 'consistency', label: 'Streak',   icon: Zap,           rpc: 'get_top_consistent',  unit: '%' },
]

const MEDALS = ['🥇', '🥈', '🥉']
const TOP3_STYLES = [
  'bg-gradient-to-br from-amber-50 to-amber-100/80 border-amber-200',
  'bg-gradient-to-br from-gray-50 to-gray-100/80 border-gray-200',
  'bg-gradient-to-br from-orange-50 to-orange-100/60 border-orange-200',
]

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('posts')
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (data[activeTab]) return
    setLoading(true)
    const tab = TABS.find(t => t.key === activeTab)
    supabase.rpc(tab.rpc, { lim: 20 }).then(({ data: rows }) => {
      setData(prev => ({ ...prev, [activeTab]: rows || [] }))
      setLoading(false)
    })
  }, [activeTab])

  const tab = TABS.find(t => t.key === activeTab)
  const rows = data[activeTab] || []

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-lightest text-gray-400 hover:text-brand-pink transition">
          <ArrowLeft size={18} />
        </button>
        <span className="font-display text-2xl font-black text-gradient italic">Leaderboard</span>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 sticky top-[57px] z-20">
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={[
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold tracking-tight transition-all border-b-2',
                isActive ? 'text-brand-pink border-brand-pink' : 'text-gray-400 border-transparent hover:text-gray-600',
              ].join(' ')}
            >
              <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
              {t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center px-6">
          <p className="text-4xl">📊</p>
          <p className="text-gray-400 text-sm">No data yet — start posting to get on the board!</p>
        </div>
      ) : (
        <div className="px-4 py-4 flex flex-col gap-2">
          {rows.map((row, i) => (
            <LeaderRow
              key={row.user_id}
              row={row}
              position={i + 1}
              unit={tab.unit}
              onClick={() => navigate(`/profile/${row.user_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LeaderRow({ row, position, unit, onClick }) {
  const isTop3 = position <= 3
  const scoreDisplay = unit === '%' ? `${row.score}%` : `${row.score} ${unit}`

  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-3 w-full p-3.5 rounded-3xl border text-left transition-all active:scale-[0.98]',
        'hover:shadow-card',
        isTop3 ? TOP3_STYLES[position - 1] : 'bg-white border-gray-100 hover:border-gray-200',
      ].join(' ')}
    >
      {/* Position / medal */}
      <div className="w-8 text-center shrink-0">
        {isTop3 ? (
          <span className="text-xl">{MEDALS[position - 1]}</span>
        ) : (
          <span className="text-sm font-bold text-gray-300">{position}</span>
        )}
      </div>

      <Avatar src={row.avatar_url} name={row.display_name} size="md" />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-900 truncate">
          {row.display_name || 'FNM Member'}
        </p>
        <p className="text-xs text-gray-400 truncate">@{row.username}</p>
      </div>

      <div className="text-right shrink-0">
        <p className={`font-black text-base ${isTop3 ? 'text-brand-pink' : 'text-gray-400'}`}>
          {scoreDisplay}
        </p>
      </div>
    </button>
  )
}
