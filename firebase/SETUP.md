# Firebase Auth setup for Rhythm

## 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. **Add project** (Spark / free plan is fine)
3. Disable Google Analytics if you don't need it

## 2. Enable Authentication (fixes `auth/configuration-not-found`)

1. Open **Authentication** (direct link: `https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication`)
2. If you see **Get started**, click it first — Auth must be initialized once per project
3. Open the **Sign-in method** tab
4. Enable **Email/Password** and **Google** → **Save**

For Google: set a support email when prompted.

If you still see `auth/configuration-not-found`, toggle providers off, save, then on again.

## 3. Register a web app

1. Project **Settings** (gear) → **General**
2. Under **Your apps**, click **Web** (`</>`)
3. App nickname: `Rhythm`
4. Copy the `firebaseConfig` values into `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

## 4. Authorized domains

**Authentication** → **Settings** → **Authorized domains**

Add every URL where the app runs:

- `localhost`
- Your Vercel domain (e.g. `your-app.vercel.app`)
- GitHub Pages host if used (e.g. `printsfluent.github.io`)

## 5. Email verification (optional)

By default Firebase sends a **verification link** after email/password sign-up.

**Skip for testing** — add to `.env`:

```env
VITE_FIREBASE_SKIP_EMAIL_VERIFICATION=true
```

Users go straight into the app after sign-up. Remove or set to `false` before production.

**Google sign-in** skips email verification (Google accounts are already verified).

## 6. Deploy env vars

**Vercel (production):**

1. Project → **Settings** → **Environment Variables**
2. Add all `VITE_FIREBASE_*` vars for **Production**, **Preview**, and **Development**
3. Optional testing flag: `VITE_FIREBASE_SKIP_EMAIL_VERIFICATION=true` (omit in production when verification is required)
4. **Redeploy** after changing env vars

Or from this repo after `npx vercel login` and `npx vercel link`:

```bash
npm run deploy:env
npm run deploy
```

**GitHub Pages:** Repository → Settings → Secrets — add the same keys for the deploy workflow.

Restart dev server after changing `.env`: `npm run dev`
