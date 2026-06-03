# Firebase Auth setup for Rhythm

## 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. **Add project** (Spark / free plan is fine)
3. Disable Google Analytics if you don't need it

## 2. Enable Email/Password sign-in

1. **Build** → **Authentication** → **Get started**
2. **Sign-in method** → **Email/Password** → **Enable** → Save

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

By default Firebase sends a **verification link** after sign-up.

- Customize template: **Authentication** → **Templates** → **Email address verification**
- Users tap the link, then **I've verified my email** in the app

To skip verification during testing: users are still created; you can test sign-in after verifying once.

## 6. Deploy env vars

**Vercel:** Project → Settings → Environment Variables — add all four `VITE_FIREBASE_*` vars.

**GitHub Pages:** Repository → Settings → Secrets — add the same keys for the deploy workflow.

Restart dev server after changing `.env`: `npm run dev`
