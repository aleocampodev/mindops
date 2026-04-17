---
name: mindops-dashboard-widgets
description: Dashboard component architecture and data-fetching patterns for MindOps. Use when creating new dashboard widgets, modifying data visualizations, or working with Tremor/Framer Motion components. Triggers on tasks involving dashboard UI, charts, analytics, or friction score display.
---

# MindOps Dashboard Widgets

## Architecture

Dashboard follows a **Server Component page → Client Component widgets** pattern:

```
src/app/dashboard/page.tsx          (Server Component — fetches ALL data)
  ├── FrictionHero.tsx              (current friction score + trend)
  ├── WeeklySummary.tsx             (7-day dot grid + stats)
  ├── MissionSidebar.tsx            (active/proposed missions)
  ├── QuickStats.tsx                (resilience, streak, friction avg)
  ├── PerspectiveCard.tsx           (latest AI insight)
  └── ThoughtGallery.tsx            (recent thoughts list)
```

**Data flows top-down:** The `page.tsx` fetches data once from Supabase and passes it as props to widgets. Widgets do NOT fetch their own data.

## Creating a New Widget

1. Create the component in `src/components/dashboard/NewWidget.tsx`
2. Mark as `'use client'` if it uses hooks, animations, or interactivity
3. Extract data-processing logic to `src/lib/dashboard/` (keep components under 200 lines)
4. Add to `src/app/dashboard/page.tsx` with data passed as props
5. Add translation keys to `messages/en.json` and `messages/es.json` under `"Dashboard"` namespace

### Component Template

```tsx
'use client'

import { useTranslations } from 'next-intl'

interface Props {
  data: SomeType[] // Data comes from page.tsx, not fetched here
}

export function NewWidget({ data }: Props) {
  const t = useTranslations('Dashboard')

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500">
        {t('newWidgetTitle')}
      </h3>
      {/* Widget content */}
    </div>
  )
}
```

## Data Helpers (src/lib/dashboard/)

Heavy data processing is extracted to helper modules:

| File           | Functions                                                                                                                             | Purpose                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `weekly.ts`    | `buildWeeklyData`, `buildDaySummaries`, `buildSessionPoints`, `computeWeeklyAvg`, `countActiveDays`, `findBestDay`, `findPeakSession` | Weekly friction analysis |
| `analytics.ts` | `calculateResilienceMetric`                                                                                                           | Resilience scoring       |

### When to create a new helper

If your data transformation is more than ~10 lines, extract it to `src/lib/dashboard/yourhelper.ts`. This keeps components focused on rendering.

## UI Stack

- **Layout:** Tailwind CSS v4 with custom color variables
- **Animations:** Framer Motion (`framer-motion`) for transitions and micro-interactions
- **Charts/Data:** Tremor (`@tremor/react`) for data visualization components
- **Icons:** Lucide React (`lucide-react`) and Phosphor React (`phosphor-react`)

## Design Patterns

### Protection Mode

Dashboard has two visual states based on `system_mode`:

- **EXECUTION** — Default light theme (`bg-[var(--color-surface,#FDFDFF)]`)
- **PROTECTION** — Warm theme (`bg-[var(--color-surface-warm,#FFF8F0)]`)

Pass `isProteccion` prop to widgets that need to adapt their colors.

### Card Pattern

All widgets use a consistent card style:

```
rounded-2xl border border-gray-100 bg-white p-6 shadow-sm
```

## Gotchas

- **`friction_score` can be null** — Always guard: `typeof t.friction_score === 'number' ? t.friction_score : 0`
- **Timezone** — Session timestamps use `America/Bogota` timezone for display (`toLocaleTimeString` with `timeZone: 'America/Bogota'`).
- **Components over 200 lines** — Extract sub-components or move logic to `src/lib/dashboard/`.
- **Never fetch data inside a widget** — All Supabase queries happen in `page.tsx` (Server Component).
- **Heavy components** (complex animations) should be lazy-loaded with `next/dynamic`.
