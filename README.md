# Rhythm

A mobile-first schedule and productivity app for young professionals balancing remote work, fitness, programming study, social life, and recovery.

Designed to feel **realistic, motivating, and sustainable** — not corporate or robotic.

## What users see

**Rhythm** helps you plan each day, stay focused, and build habits without punishing you for missed days.

- **Home** — today’s plan, mood, progress, and what’s coming up  
- **Plan** — color-coded time blocks you can drag into order  
- **Focus** — Pomodoro / deep-work timers with ambient sound  
- **Habits** — streaks with grace days (consistency over perfection)  
- **Insights** — charts, sleep logging, balance tips, and reminders  

Sign in with email or Google. Your schedule and habits are stored on your device; your account keeps the app private to you.

## Features

### Core
- **Dashboard** — day overview, active task, progress %, daily quote, mood/energy, upcoming blocks
- **Schedule planner** — editable, color-coded time blocks with drag-and-drop reorder
- **Focus mode** — Pomodoro, deep work, and study timers with break reminders
- **Habit tracker** — flexible streaks, recovery days, consistency scoring
- **Analytics** — weekly productivity, study/focus hours, mood vs productivity charts, sleep logging
- **Balance** — fun/rest scheduling, weekend reset planner, burnout prevention tips
- **Calendar** — monthly view with completion and mood indicators

### Philosophy
- Missed days don't destroy streaks (2 grace days/week)
- Recovery days count
- Power/internet outage tags lower the bar
- Mood and energy adjust expectations
- Consistency > perfection

### Technical
- Dark mode UI (iOS-inspired)
- Smooth animations
- Browser notifications
- Offline support (PWA + localStorage)
- iPhone-optimized viewport & safe areas

## How to view it

### Development (recommended)

```bash
cd "/Users/USER/Documents/ cursor_projects/schedule"
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

**On iPhone:** run with network access, then open the Network URL on your phone (same Wi‑Fi):

```bash
npm run dev -- --host
```

### Install as app (PWA)

1. Run `npm run build && npm run preview`
2. Open the preview URL in Safari (iPhone) or Chrome
3. **iPhone:** Share → Add to Home Screen
4. **Android/Chrome:** Install app prompt or menu → Install

### Production build

```bash
npm run build
npm run preview
```

## Screens

| Tab | What it does |
|-----|--------------|
| **Home** | Today's progress, quote, mood, upcoming blocks, quick tasks |
| **Plan** | Edit schedule blocks, drag to reorder, set recurring routines |
| **Focus** | Timers + ambient sounds (rain, brown noise, lo-fi) |
| **Habits** | Daily habits, streaks, recovery/outage tags |
| **Insights** | Analytics, balance planner, calendar |

## Notifications

Go to **Insights → Balance → Reminders** and tap **Enable notifications**. Keep the app open or installed as PWA for reminders to fire.
