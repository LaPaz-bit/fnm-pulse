import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import GoalCard from '@/components/goals/GoalCard'
import ChallengeCard from '@/components/goals/ChallengeCard'
import Spinner from '@/components/ui/Spinner'
import { StaggerList, StaggerItem } from '@/components/ui/Motion'
import { Target, Zap, ChevronDown, ChevronUp } from 'lucide-react'

const GOAL_SELECT = `
  id, title, description, status, end_date, owner_id, post_id,
  owner:profiles!owner_id(id, display_name, avatar_url),
  goal_members(user_id)
`
const CHALLENGE_SELECT = `
  id, title, description, status, start_date, end_date, created_by,
  creator:profiles!created_by(id, display_name, avatar_url),
  challenge_members(user_id)
`

function isExpired(item) {
  if (!item.end_date) return false
  return new Date(item.end_date) < new Date(new Date().setHours(0, 0, 0, 0))
}

export default function GoalsPage() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [archivedOpen, setArchivedOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('goals').select(GOAL_SELECT).order('created_at', { ascending: false }),
      supabase.from('challenges').select(CHALLENGE_SELECT).order('created_at', { ascending: false }),
    ]).then(([g, c]) => {
      setGoals(g.data || [])
      setChallenges(c.data || [])
      setLoading(false)
    })
  }, [])

  const isMember = (members) => members?.some(m => m.user_id === user?.id)
  const myActiveGoals      = goals.filter(g => g.status === 'active' && !isExpired(g) && isMember(g.goal_members))
  const myArchivedGoals    = goals.filter(g => isMember(g.goal_members) && (g.status !== 'active' || isExpired(g)))
  const activeChallenges   = challenges.filter(c => c.status !== 'ended' && !isExpired(c) && isMember(c.challenge_members))
  const archivedChallenges = challenges.filter(c => isMember(c.challenge_members) && (c.status === 'ended' || isExpired(c)))
  const hasArchived      = myArchivedGoals.length > 0 || archivedChallenges.length > 0

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <span className="font-display text-2xl font-black text-gradient italic">Goals &amp; Challenges</span>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="px-4 py-5 flex flex-col gap-7">

          {/* Official Challenges */}
          <Section
            icon={<Zap size={14} className="text-white" />}
            iconBg="bg-brand-gradient"
            title="Official Challenges"
            count={activeChallenges.length}
          >
            {activeChallenges.length === 0 ? (
              <EmptySection emoji="⚡" message="No active challenges right now. Check back soon!" />
            ) : (
              <StaggerList>
                {activeChallenges.map(c => <StaggerItem key={c.id}><ChallengeCard challenge={c} /></StaggerItem>)}
              </StaggerList>
            )}
          </Section>

          {/* Member Goals */}
          <Section
            icon={<Target size={14} className="text-white" />}
            iconBg="bg-brand-gradient"
            title="Community Goals"
            count={myActiveGoals.length}
          >
            {myActiveGoals.length === 0 ? (
              <EmptySection emoji="🎯" message="You haven't joined any goals yet. Join a goal from the feed to see it here!" />
            ) : (
              <StaggerList>
                {myActiveGoals.map(g => <StaggerItem key={g.id}><GoalCard goal={g} /></StaggerItem>)}
              </StaggerList>
            )}
          </Section>

          {/* Archived */}
          {hasArchived && (
            <div>
              <button
                onClick={() => setArchivedOpen(v => !v)}
                className="flex items-center gap-2 w-full text-left py-2 text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider transition-colors"
              >
                <motion.span animate={{ rotate: archivedOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} />
                </motion.span>
                Archived ({myArchivedGoals.length + archivedChallenges.length})
              </button>
              <AnimatePresence>
                {archivedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-3 mt-2">
                      {archivedChallenges.map(c => <ChallengeCard key={c.id} challenge={c} isArchived />)}
                      {myArchivedGoals.map(g => <GoalCard key={g.id} goal={g} isArchived />)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ icon, iconBg, title, count, children }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className={`w-6 h-6 rounded-lg ${iconBg} flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
        <h2 className="font-bold text-gray-900 text-sm tracking-tight">{title}</h2>
        {count > 0 && (
          <span className="text-xs font-bold text-brand-pink bg-brand-lightest px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function EmptySection({ emoji, message }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center border-2 border-dashed border-brand-light/60 rounded-3xl bg-brand-lightest/50">
      <span className="text-3xl">{emoji}</span>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">{message}</p>
    </div>
  )
}
