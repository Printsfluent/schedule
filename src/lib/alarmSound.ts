let alarmInterval: number | null = null

function beep(ctx: AudioContext, freq: number, start: number, dur: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.35, start)
  gain.gain.exponentialRampToValueAtTime(0.01, start + dur)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + dur)
}

export function playAlarmSound(style: 'gentle' | 'classic' | 'urgent' = 'classic') {
  void (async () => {
    try {
      const { resumeAudioContext } = await import('./audioContext')
      const ctx = await resumeAudioContext()
      const t = ctx.currentTime
      const patterns: Record<string, number[]> = {
        gentle: [440, 523],
        classic: [880, 880, 660, 880],
        urgent: [880, 880, 880, 880, 660, 880],
      }
      patterns[style].forEach((freq, i) => beep(ctx, freq, t + i * 0.35, 0.28))
    } catch {
      /* audio blocked until user gesture — ignore */
    }
  })()
}

export function startAlarmLoop(style: 'gentle' | 'classic' | 'urgent' = 'classic') {
  stopAlarmLoop()
  playAlarmSound(style)
  alarmInterval = window.setInterval(() => playAlarmSound(style), 3000)
}

export function stopAlarmLoop() {
  if (alarmInterval) {
    clearInterval(alarmInterval)
    alarmInterval = null
  }
}

export function vibrateAlarm() {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 150, 400, 150, 600])
    }
  } catch {
    /* iOS Safari often ignores */
  }
}
