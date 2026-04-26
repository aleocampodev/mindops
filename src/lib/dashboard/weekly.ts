// Weekly friction data helpers — extracted from dashboard/page.tsx
// to keep the page component under the 200-line guideline.

interface ThoughtTimestamp {
  friction_score?: number
  created_at: string
}

export interface DayData {
  label: string
  date: string
  avgFriction: number
  sessions: number
  isToday: boolean
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getStartOfWeek(weeksAgo: number): Date {
  const now = new Date()
  const day = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - day - weeksAgo * 7)
  start.setHours(0, 0, 0, 0)
  return start
}

export function buildWeeklyData(thoughts: ThoughtTimestamp[]): DayData[] {
  const weekStart = getStartOfWeek(0)
  const today = new Date()

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)

    const dayThoughts = thoughts.filter((t) => {
      const d = new Date(t.created_at)
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
      )
    })

    const scores = dayThoughts
      .map((t) => (typeof t.friction_score === 'number' ? t.friction_score : null))
      .filter((s): s is number => s !== null)

    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    return {
      label: DAY_LABELS[date.getDay()],
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgFriction: avg,
      sessions: dayThoughts.length,
      isToday: date.toDateString() === today.toDateString(),
    }
  })
}

export function computeWeeklyAvg(thoughts: ThoughtTimestamp[], weeksAgo: number): number {
  const start = getStartOfWeek(weeksAgo)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  const scores = thoughts
    .filter((t) => {
      const d = new Date(t.created_at)
      return d >= start && d < end
    })
    .map((t) => (typeof t.friction_score === 'number' ? t.friction_score : null))
    .filter((s): s is number => s !== null)

  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
}

export function countWeekSessions(thoughts: ThoughtTimestamp[], weeksAgo: number): number {
  const start = getStartOfWeek(weeksAgo)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return thoughts.filter((t) => {
    const d = new Date(t.created_at)
    return d >= start && d < end
  }).length
}

export function countActiveDays(thoughts: ThoughtTimestamp[], weeksAgo: number): number {
  const start = getStartOfWeek(weeksAgo)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  const days = new Set(
    thoughts
      .filter((t) => {
        const d = new Date(t.created_at)
        return d >= start && d < end
      })
      .map((t) => new Date(t.created_at).toDateString())
  )
  return days.size
}

export function findBestDay(thoughts: ThoughtTimestamp[]): string | null {
  const weekData = buildWeeklyData(thoughts)
  const activeDays = weekData.filter((d) => d.sessions > 0)
  if (!activeDays.length) return null
  const best = activeDays.reduce((a, b) => (a.avgFriction <= b.avgFriction ? a : b))
  return DAY_NAMES[DAY_LABELS.indexOf(best.label)]
}

// ── Session-level data for WeeklyTimeline ────────────────────

interface ThoughtWithId extends ThoughtTimestamp {
  id: string
}

export interface SessionPoint {
  id: string
  score: number
  timestamp: string
  dayLabel: string
  timeLabel: string
}

export interface DaySummary {
  label: string
  date: string
  sessions: number
  avgScore: number
  isToday: boolean
}

export function buildSessionPoints(thoughts: ThoughtWithId[]): SessionPoint[] {
  const weekStart = getStartOfWeek(0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  return thoughts
    .filter((t) => {
      const d = new Date(t.created_at)
      return d >= weekStart && d < weekEnd
    })
    .map((t) => ({
      id: t.id,
      score: typeof t.friction_score === 'number' ? t.friction_score : 20,
      timestamp: t.created_at,
      dayLabel: DAY_LABELS[new Date(t.created_at).getDay()],
      timeLabel: new Date(t.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Bogota',
      }),
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export function buildDaySummaries(
  thoughts: ThoughtTimestamp[],
  locale: string = 'en'
): DaySummary[] {
  const weekStart = getStartOfWeek(0)
  const today = new Date()

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)

    const dayThoughts = thoughts.filter((t) => {
      const d = new Date(t.created_at)
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
      )
    })

    const scores = dayThoughts
      .map((t) => (typeof t.friction_score === 'number' ? t.friction_score : null))
      .filter((s): s is number => s !== null)

    return {
      label: date.toLocaleDateString(locale, { weekday: 'short' }),
      date: date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
      sessions: dayThoughts.length,
      avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      isToday: date.toDateString() === today.toDateString(),
    }
  })
}

export function findPeakSession(sessions: SessionPoint[]): { score: number; label: string } | null {
  if (!sessions.length) return null
  const peak = sessions.reduce((a, b) => (a.score >= b.score ? a : b))
  return { score: peak.score, label: `${peak.dayLabel} ${peak.timeLabel}` }
}

export function findLowestSession(
  sessions: SessionPoint[]
): { score: number; label: string } | null {
  if (!sessions.length) return null
  const lowest = sessions.reduce((a, b) => (a.score <= b.score ? a : b))
  return { score: lowest.score, label: `${lowest.dayLabel} ${lowest.timeLabel}` }
}
