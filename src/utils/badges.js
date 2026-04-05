import { supabase } from '@/lib/supabase'
import { sendPushNotification } from '@/utils/pushNotifications'

// Badge emoji map (keyed by badge name)
export const BADGE_META = {
  first_post:     { emoji: '📝', label: 'First Post' },
  first_win:      { emoji: '🏆', label: 'First Win' },
  goal_joiner:    { emoji: '🤝', label: 'Team Player' },
  goal_completer: { emoji: '🏁', label: 'Finisher' },
  milestone_25:   { emoji: '⚡', label: '25 Posts Strong' },
  top_encourager: { emoji: '💖', label: 'Top Encourager' },
}

async function getBadge(name) {
  const { data } = await supabase
    .from('badges')
    .select('id, name, description')
    .eq('name', name)
    .maybeSingle()
  return data
}

async function alreadyAwarded(userId, badgeId) {
  const { data } = await supabase
    .from('member_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_id', badgeId)
    .maybeSingle()
  return !!data
}

async function award(userId, badge) {
  const { error } = await supabase
    .from('member_badges')
    .insert({ user_id: userId, badge_id: badge.id })
  if (error) return null

  const meta = BADGE_META[badge.name] ?? {}

  await supabase.from('notifications').insert({
    user_id:        userId,
    type:           'badge',
    reference_id:   badge.id,
    reference_type: 'badge',
  })

  sendPushNotification(
    userId,
    `Badge Earned: ${meta.label ?? badge.name}!`,
    badge.description ?? '',
    '/profile',
  )

  return { ...badge, ...meta }
}

async function tryAward(userId, badgeName) {
  const badge = await getBadge(badgeName)
  if (!badge) return null
  if (await alreadyAwarded(userId, badge.id)) return null
  return award(userId, badge)
}

// Call after a post is created. Returns array of newly awarded badges.
export async function onPostCreated(userId, isWin = false) {
  const awarded = []

  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId)

  if (count >= 1) {
    const b = await tryAward(userId, 'first_post')
    if (b) awarded.push(b)
  }
  if (count >= 25) {
    const b = await tryAward(userId, 'milestone_25')
    if (b) awarded.push(b)
  }
  if (isWin) {
    const b = await tryAward(userId, 'first_win')
    if (b) awarded.push(b)
  }

  return awarded
}

// Call after joining a goal or challenge. Returns newly awarded badge or null.
export async function onGoalJoined(userId) {
  const [goalsRes, challengesRes] = await Promise.all([
    supabase
      .from('goal_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('challenge_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])
  const total = (goalsRes.count || 0) + (challengesRes.count || 0)
  if (total >= 3) return tryAward(userId, 'goal_joiner')
  return null
}

// Call after marking a goal or challenge complete.
export async function onGoalCompleted(userId) {
  return tryAward(userId, 'goal_completer')
}
