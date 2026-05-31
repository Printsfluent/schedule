import type { Mood } from '../types'

export const MOOD_CONFIG: Record<Mood, { label: string; emoji: string; color: string }> = {
  great: { label: 'Great', emoji: '⚡', color: '#3dd68c' },
  good: { label: 'Good', emoji: '🙂', color: '#6ee7b7' },
  okay: { label: 'Okay', emoji: '😐', color: '#f4d35e' },
  tired: { label: 'Tired', emoji: '😮‍💨', color: '#f4a261' },
  rough: { label: 'Rough', emoji: '🌧️', color: '#e76f6f' },
}

export const MOOD_MESSAGES: Record<Mood, string[]> = {
  great: [
    'High energy day — ride the wave, but don\'t burn out by noon.',
    'You\'re sharp today. Tackle the hard stuff while your brain is hot.',
    'Great mood is a gift. Use it on study before work drains you.',
    'Channel this energy into one deep block. That\'s a win already.',
    'Feeling electric? Gym will feel good today. Use it.',
    'Best days still need structure. Don\'t waste the clarity.',
    'You could overdo it today. Pace yourself anyway.',
  ],
  good: [
    'Solid day ahead. Stack small wins and keep moving.',
    'Good energy — show up for the plan, not perfection.',
    'Steady pace wins. One block at a time.',
    'Not every day needs to be heroic. Good is enough.',
    'You\'ve got enough in the tank. Start with the easiest win.',
    'Good mood + good plan = sustainable progress.',
    'Keep it simple today. Execute the routine.',
  ],
  okay: [
    'Not amazing, not terrible — a normal day is enough.',
    'Okay days still count. Consistency beats perfect mood.',
    'You don\'t need to feel great to make progress.',
    'Middle energy is fine. Do the next right thing.',
    'Average days build extraordinary streaks.',
    'Show up at 60%. That\'s still showing up.',
    'Neutral mood? Let habit carry you today.',
  ],
  tired: [
    'Low energy? Lower the bar. Showing up still counts.',
    'Tired days need less to win. One habit is enough.',
    'Rest when you can. Don\'t guilt yourself for moving slow.',
    'Sleep debt is real. Protect tonight\'s wind-down.',
    'Skip the guilt. Do one thing, then reassess.',
    'Tired isn\'t lazy. Adjust the plan, not your worth.',
    'Half speed is still forward. One checkbox counts.',
    'Maybe today is a recovery day in disguise.',
  ],
  rough: [
    'Power out? Show up anyway. One win is enough.',
    'Rough days happen. Bad news, low energy — one checkbox is a win.',
    'You don\'t need a perfect day. You need a real one.',
    'Infrastructure, mood, life — tag it rough and be gentle with yourself.',
    'Everything feels heavy? Do the smallest possible thing.',
    'Bad days don\'t erase good streaks. Grace days exist for this.',
    'NEPA, traffic, stress — Nigeria happens. Breathe first.',
    'If all you do today is survive and log mood, that counts.',
    'Rough mornings don\'t mean rough weeks. Reset now.',
  ],
}

export const OUTAGE_MESSAGES = [
  'Power or internet out? Do what you can offline. One win is enough today.',
  'No light, no Wi‑Fi — read, stretch, plan on paper. Still progress.',
  'Outage day = lower bar. Tag it and be kind to yourself.',
  'Generator life? Protect your energy. One block offline counts.',
]

export function getMoodMessage(mood: Mood, index: number): string {
  const messages = MOOD_MESSAGES[mood]
  return messages[index % messages.length]
}

export function getOutageMessage(index: number): string {
  return OUTAGE_MESSAGES[index % OUTAGE_MESSAGES.length]
}

export function nextMessageIndex(current: number, total: number): number {
  return (current + 1) % total
}

export function randomMessageIndex(total: number): number {
  return Math.floor(Math.random() * total)
}

export function messageCount(mood: Mood): number {
  return MOOD_MESSAGES[mood].length
}

// Legacy export for any other usages
export const OUTAGE_MESSAGE = OUTAGE_MESSAGES[0]
