import { isValidEmail, isValidUsername } from './validation'

const LOGIN_MAP_PREFIX = 'rhythm-login:'

function authEmailDomain(): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  return projectId ? `${projectId}.rhythm.auth` : 'accounts.rhythm.auth'
}

export function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${authEmailDomain()}`
}

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
}

function usernameFromEmailLocalPart(email: string): string {
  const local = (email.split('@')[0] ?? 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_')
  const trimmed = local.slice(0, 20)
  if (isValidUsername(trimmed)) return trimmed
  return trimmed.length >= 3 ? trimmed : 'user'
}

/** Remember which Firebase email belongs to a username (same device). */
export function storeUsernameLoginEmail(username: string, firebaseEmail: string): void {
  const key = normalizeUsername(username)
  if (!isValidUsername(key) || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(`${LOGIN_MAP_PREFIX}${key}`, firebaseEmail.trim().toLowerCase())
  } catch {
    /* private mode */
  }
}

function storedEmailForUsername(username: string): string | null {
  if (typeof localStorage === 'undefined') return null
  const key = normalizeUsername(username)
  if (!isValidUsername(key)) return null
  try {
    return localStorage.getItem(`${LOGIN_MAP_PREFIX}${key}`)
  } catch {
    return null
  }
}

export type ResolvedAuthIdentifier =
  | { ok: true; email: string; username: string; usedUsername: boolean }
  | { ok: false; message: string }

function resolveAsEmail(raw: string): ResolvedAuthIdentifier | null {
  if (!raw.includes('@')) return null
  if (!isValidEmail(raw)) {
    return { ok: false, message: 'Enter a valid email address.' }
  }
  const email = raw.toLowerCase()
  return {
    ok: true,
    email,
    username: usernameFromEmailLocalPart(email),
    usedUsername: false,
  }
}

function resolveAsUsername(raw: string): ResolvedAuthIdentifier | null {
  const username = normalizeUsername(raw)
  if (!isValidUsername(username)) {
    return {
      ok: false,
      message: 'Enter a valid email or username (3–20 letters, numbers, underscore).',
    }
  }

  const stored = storedEmailForUsername(username)
  return {
    ok: true,
    email: stored ?? usernameToAuthEmail(username),
    username,
    usedUsername: true,
  }
}

/** Accept a real email or a Rhythm username for sign-in / sign-up. */
export function resolveAuthIdentifier(input: string): ResolvedAuthIdentifier {
  const raw = input.trim()
  if (!raw) {
    return { ok: false, message: 'Enter your email or username.' }
  }

  const asEmail = resolveAsEmail(raw)
  if (asEmail) {
    if (!asEmail.ok) return asEmail
    return asEmail
  }

  const asUsername = resolveAsUsername(raw)
  if (asUsername) return asUsername

  return { ok: false, message: 'Enter your email or username.' }
}

/** Extra sign-in attempts when the first resolved email does not match the account. */
export function signInEmailAttempts(identifier: string): string[] {
  const resolved = resolveAuthIdentifier(identifier)
  if (!resolved.ok) return []

  const emails = [resolved.email]

  if (!resolved.usedUsername) {
    const local = normalizeUsername(identifier.split('@')[0] ?? '')
    if (local && isValidUsername(local)) {
      const synthetic = usernameToAuthEmail(local)
      if (!emails.includes(synthetic)) emails.push(synthetic)
    }
    return emails
  }

  const synthetic = usernameToAuthEmail(resolved.username)
  if (!emails.includes(synthetic)) emails.push(synthetic)

  return emails
}
