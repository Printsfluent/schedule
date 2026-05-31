import { useEffect, useRef } from 'react'
import { resumeAudioContext } from '../lib/audioContext'
import type { AmbientSound } from '../types'

export function useAmbientSound(sound: AmbientSound, volume: number, active: boolean) {
  const gainRef = useRef<GainNode | null>(null)
  const nodesRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume
  }, [volume])

  useEffect(() => {
    if (!active || sound === 'none') {
      nodesRef.current?.stop()
      nodesRef.current = null
      gainRef.current = null
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const ctx = await resumeAudioContext()
        if (cancelled) return

        nodesRef.current?.stop()

        const gain = ctx.createGain()
        gain.gain.value = volume
        gain.connect(ctx.destination)
        gainRef.current = gain

        let stop = () => {}

        if (sound === 'brown') {
          const bufferSize = 2 * ctx.sampleRate
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const data = buffer.getChannelData(0)
          let last = 0
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1
            last = (last + 0.02 * white) / 1.02
            data[i] = last * 3.5
          }
          const source = ctx.createBufferSource()
          source.buffer = buffer
          source.loop = true
          source.connect(gain)
          source.start()
          stop = () => source.stop()
        } else if (sound === 'rain') {
          const bufferSize = 2 * ctx.sampleRate
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const data = buffer.getChannelData(0)
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.15
          }
          const source = ctx.createBufferSource()
          source.buffer = buffer
          source.loop = true
          const filter = ctx.createBiquadFilter()
          filter.type = 'lowpass'
          filter.frequency.value = 800
          source.connect(filter)
          filter.connect(gain)
          source.start()
          stop = () => source.stop()
        } else if (sound === 'lofi') {
          const osc = ctx.createOscillator()
          osc.type = 'sine'
          osc.frequency.value = 220
          const lfo = ctx.createOscillator()
          lfo.frequency.value = 0.08
          const lfoGain = ctx.createGain()
          lfoGain.gain.value = 30
          lfo.connect(lfoGain)
          lfoGain.connect(osc.frequency)
          osc.connect(gain)
          osc.start()
          lfo.start()
          stop = () => {
            osc.stop()
            lfo.stop()
          }
        }

        if (!cancelled) nodesRef.current = { stop }
      } catch {
        /* blocked until user gesture */
      }
    })()

    return () => {
      cancelled = true
      nodesRef.current?.stop()
      nodesRef.current = null
      gainRef.current = null
    }
  }, [sound, volume, active])
}
