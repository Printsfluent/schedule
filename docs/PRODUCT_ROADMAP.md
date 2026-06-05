# Rhythm Product Roadmap

**North star:** *Build a realistic life, not just a task list.*

Target: 100k MAU via retention-first product design — not feature bloat.

---

## What already exists (skip duplicate work)

| Area | Status in app today |
|------|---------------------|
| Dashboard | Home tab: progress ring, gentle streak, mood quotes, plan timeline, tasks, burnout banner |
| Evening planning | End-of-day prompt → plan tomorrow → calendar export |
| Morning wake | Sleep log overlay + sleep feedback |
| Routines | Template plans (weekday/weekend/exam/gym/morning/night) in `routineTemplates.ts` |
| Focus | Pomodoro / deep-work / study timers + ambient sound + Spotify |
| Habits | Streaks, grace days, recovery/outage tags, 14-day history |
| Analytics | Insights: week stats, mood vs productivity, calendar heatmap, ideal vs actual |
| Gamification | XP, levels, Rhythm pet by streak |
| Retention | Reminders, persistent alarms, snooze, PWA + Firestore sync |
| Life balance | 6 categories on all blocks/plan items |
| Dark mode | System/light/dark theme tokens |

---

## Feature roadmap (phased)

### Phase 1 — Foundation (now → 4 weeks)
*Ship what users feel on day 1*

- [x] Guided onboarding (wake, sleep, work hours, goals → schedule)
- [x] Dashboard: time left today, productivity score, quick stats
- [x] Plan timeline = user's daily picks per day (not raw template)
- [x] Category balance chart (Insights)
- [x] Weekly goals panel (Insights)
- [x] Achievement badges (milestones)
- [x] Schedule conflict detection (Plan tab)
- [x] Wake delay computation (adaptive banner wired)
- [ ] Rule-based “describe your day” schedule parser (v1, no API)

### Phase 2 — Smart scheduling (4–8 weeks)
- Auto-shift plan when wake is late (respect sleep/wind-down anchors)
- Missed-block suggestions (“move gym to 6 PM?”)
- Workload rebalancing across categories
- Named saved routines (Morning / Work / Study / Gym / Night)

### Phase 3 — Intelligence (8–16 weeks)
- LLM schedule generator (OpenAI/Anthropic) behind Premium
- Weekly AI review (“you under-indexed social this week”)
- Habit ↔ schedule linking

### Phase 4 — Growth (16+ weeks)
- Premium tier, referral, share routines marketplace
- Push re-engagement, streak-at-risk nudges
- Team/family plans

---

## UX improvements ranked by impact

| Rank | Change | Why |
|------|--------|-----|
| 1 | Onboarding → realistic schedule in 2 min | Activation; empty state kills retention |
| 2 | Timeline shows *picked plan* per day | Trust; fixes “app ignores my choices” |
| 3 | Home shows time left + productivity score | Daily reason to open app |
| 4 | Category balance visualization | Differentiation vs todo apps |
| 5 | Achievements + celebrations | Habit loop completion |
| 6 | Wake-delay auto-shift | “Adaptive” promise delivered |
| 7 | Weekly goals UI | Connects Sunday planning block to product |
| 8 | Conflict warnings | Prevents unrealistic plans |
| 9 | AI natural-language schedule | Premium hook; high wow factor |
| 10 | Offline-first PWA | Nigeria / spotty connectivity markets |

---

## Data schema recommendations

Current: single `AppState` blob in Firestore `users/{uid}/appdata/state`.

**Evolve toward:**

```typescript
// users/{uid}
profile: {
  wakeMinutes, sleepMinutes, workWindow, studyGoalHours,
  gymDaysPerWeek, priorities[], onboardingCompletedAt
}

// users/{uid}/days/{YYYY-MM-DD}
day: {
  mood, sleepHours, wakeDelayMinutes, dailyPlan[], completedIds[],
  productivityScore, flags: { recovery, outage }
}

// users/{uid}/weeks/{YYYY-Www}
weeklyPlan: { workFocus, studyGoal, healthGoal, socialPlan, restPlan, items[] }

// users/{uid}/achievements/{id}
achievement: { unlockedAt, seen }

// users/{uid}/routines/{id}  — Phase 2
routine: { name, kind, planItems[], recurring }
```

Keep client-first localStorage; Firestore remains debounced mirror.

---

## UI redesign principles

1. **One hero metric per screen** — Home: progress %; Insights: streak/pet; Plan: today's chain
2. **Category color = identity** — never gray boxes for life areas
3. **Empty states teach** — “Plan tonight” not “No data”
4. **Motion with purpose** — `slide-up` on overlays, `duration-700` on charts
5. **Thumb zone** — primary actions bottom 40% on mobile
6. **Premium feel** — inset panels, accent glow on focus cards, mono for times

---

## Technical implementation plan

| Feature | Files | Effort |
|---------|-------|--------|
| Onboarding | `OnboardingOverlay.tsx`, `onboardingSchedule.ts`, store | M |
| Category balance | `categoryBalance.ts`, Insights section | S |
| Achievements | `achievements.ts`, `AchievementsPanel.tsx` | S |
| Weekly goals | `WeeklyGoalsPanel.tsx`, `updateWeeklyPlan` | S |
| Conflicts | `scheduleConflicts.ts`, Schedule banner | S |
| Wake delay | `wakeDelay.ts`, `setSleep` hook | S |
| AI schedule v2 | Edge function + `VITE_OPENAI_KEY` | L |

---

## Premium / revenue recommendations

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | Full schedule, habits, gentle streak, templates |
| **Rhythm+** | $4.99/mo | AI schedule generator, advanced analytics, unlimited routines, export |
| **Rhythm+ annual** | $39/yr | Same + 2 months free |

**Conversion hooks:** AI “describe my week”, category balance history >30 days, custom routine library.

---

## Differentiation checklist

Every new feature must answer: *Does this help balance career, health, learning, relationships, fun, and rest?*

- ✅ Category-tagged everything
- ✅ Burnout guard (16h work/study/gym)
- ✅ Recovery days count toward streak
- ✅ Realistic mode adds buffers
- 🔲 Balance score (“you’re heavy on work this week”)
- 🔲 Social/rest nudges

---

*Last updated: June 2026 — align with `src/` implementation.*
