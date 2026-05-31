import { createAudioContext } from './browserCompat'

let ctx: AudioContext | null = null

export async function resumeAudioContext(): Promise<AudioContext> {
  ctx = ctx ?? createAudioContext()
  if (ctx.state === 'suspended') await ctx.resume()
  return ctx
}

export function getAudioContext(): AudioContext | null {
  return ctx
}
