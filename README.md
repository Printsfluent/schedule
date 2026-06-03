# Rhythm

A mobile-first schedule and productivity app for balancing work, fitness, study, social life, and recovery.

Designed to feel **realistic, motivating, and sustainable** — not corporate or robotic.

**Live app:** [rhythm-tau.vercel.app](https://rhythm-tau.vercel.app)

## What Rhythm does

**Rhythm** helps you plan each day, stay focused, and build habits without punishing you for missed days.

| Tab | What it does |
|-----|--------------|
| **Home** | Today’s plan, mood, progress, quotes, and what’s coming up |
| **Plan** | Color-coded time blocks — drag to reorder, edit labels (default blocks use **Work**, not fixed copy) |
| **Focus** | Pomodoro and deep-work timers with ambient sound |
| **Habits** | Daily habits, streaks, grace days, recovery/outage tags |
| **Insights** | Analytics, calendar, settings, **About Rhythm**, account, and reminders |

### Philosophy

- Missed days don’t destroy streaks (2 grace days/week)
- Recovery days count
- Power/internet outage tags lower the bar
- Mood and energy adjust expectations
- Consistency over perfection

### Data and privacy

- **Sign-in required** — Firebase Auth gates the app
- **Schedule and habits** stay in your browser (`localStorage`) on each device
- Your Firebase account identifies you; plan data does not sync to the cloud yet

## Authentication

Rhythm uses **Firebase Auth** (email/password + Google).

### Sign in / sign up

On the login screen, use **one field: Email or username**.

| You enter | What happens |
|-----------|----------------|
| **Email** (contains `@`) | Signs in with that email and your password |
| **Username** (no `@`) | Signs in with the username account created at sign-up (`username@YOUR_PROJECT_ID.rhythm.auth` internally) |

You can also use **Continue with Google**.

After a successful email sign-in on a device, the app remembers your username locally so you can sign in with either email or username next time.

### Environment variables

Copy `.env.example` to `.env` and fill in your Firebase web app config:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...

# Optional — skip email verification links during testing
VITE_FIREBASE_SKIP_EMAIL_VERIFICATION=true
```

Step-by-step Firebase setup: [`firebase/SETUP.md`](firebase/SETUP.md)

### About the app (in the UI)

The **About Rhythm** blurb lives under **Insights → Settings**, not on the login page.

## Local development

```bash
npm install
cp .env.example .env   # then add your Firebase keys
npm run dev
```

| Command | Purpose |
|---------|---------|
| `npm run dev` | HTTPS dev server at `https://localhost:5173` (default) |
| `npm run dev:http` | HTTP only (notifications limited on phones) |
| `npm run preview` | Preview production build locally |

Open **https://localhost:5173/login** after starting the dev server.

**On iPhone (same Wi‑Fi):** use the Network URL printed in the terminal (accept the certificate warning once).

## Production build

```bash
npm run build
npm run preview
```

## Deploy

### Vercel (recommended)

1. Connect the repo to Vercel
2. Add all `VITE_FIREBASE_*` variables under **Project → Settings → Environment Variables**
3. Redeploy after changing env vars

```bash
npx vercel login
npx vercel link
npm run deploy:env   # push .env Firebase vars to Vercel
npm run deploy       # build and deploy to production
```

### GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds with `VITE_BASE_PATH=/schedule/` and expects Firebase secrets in the repository settings.

## Install as an app (PWA)

1. `npm run build && npm run preview` (or use the deployed URL)
2. Open in Safari (iPhone) or Chrome
3. **iPhone:** Share → Add to Home Screen
4. **Android/Chrome:** Install when prompted

The service worker registers **after** sign-in so guests always get a fresh login page.

## Notifications

**Insights → Settings** — enable reminders in the alarm/notification panels. Works best with the app installed as a PWA or kept open on mobile.

## Native apps (Capacitor)

```bash
npm run cap:sync
npm run cap:ios      # or cap:android
```

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Firebase Auth
- PWA (Vite PWA plugin)
- Capacitor (optional iOS/Android)
- Deploy: Vercel and/or GitHub Pages

## Project layout

| Path | Purpose |
|------|---------|
| `src/pages/` | Main screens (Home, Plan, Focus, Habits, Insights, Login) |
| `src/context/AuthContext.tsx` | Firebase session and sign-in/up |
| `src/lib/auth/` | Validation, username/email resolution, session reset |
| `src/content/appSummary.ts` | About copy shown in Insights → Settings |
| `firebase/SETUP.md` | Firebase console checklist |
| `scripts/sync-vercel-env.sh` | Sync `.env` to Vercel |

## Staying signed in

After a user signs in, Firebase keeps them logged in on that device until they tap **Sign out** (**Insights → Settings → Account**).

## Forcing every device to log in again

Bump `AUTH_LOGIN_REQUIRED_EPOCH` in `src/lib/auth/gateVersion.ts` (same number as `AUTH_GATE_GENERATION`), commit, and deploy. On the next visit each device:

1. Clears saved Firebase / Supabase auth tokens  
2. Purges stale PWA caches  
3. Redirects to `/login`  

Anyone who used the app before login was required must create an account or sign in. Users who already signed in on the new epoch stay signed in until the next bump or sign out.
