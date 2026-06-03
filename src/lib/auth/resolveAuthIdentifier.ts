import { isValidEmail, isValidUsername } from './validation'

function authEmailDomain(): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  return projectId ? `${projectId}.rhythm.auth` : 'accounts.rhythm.auth'
}

export function usernameToAuthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${authEmailDomain()}`
}

function usernameFromEmailLocalPart(email: string): string {
  const local = (email.split('@')[0] ?? 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_')
  const trimmed = local.slice(0, 20)
  if (isValidUsername(trimmed)) return trimmed
  return trimmed.length >= 3 ? trimmed : 'user'
}

export type ResolvedAuthIdentifier =
  | { ok: true; email: string; username: string; usedUsername: boolean }
  | { ok: false; message: string }

/** Accept a real email or a Rhythm username for sign-in / sign-up. */
export function resolveAuthIdentifier(input: string): ResolvedAuthIdentifier {
  const raw = input.trim()
  if (!raw) {
    return { ok: false, message: 'Enter your email or username.' }
  }

  if (isValidEmail(raw)) {
    const email = raw.toLowerCase()
    return {
      ok: true,
      email,
      username: usernameFromEmailLocalPart(email),
      usedUsername: false,
    }
  }

  const username = raw.toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (!isValidUsername(username)) {
    return {
      ok: false,
      message: 'Enter a valid email or username (3–20 letters, numbers, underscore).',
    }
  }

  return {
    ok: true,
    email: usernameToAuthEmail(username),
    username,
    usedUsername: true,
  }
}
