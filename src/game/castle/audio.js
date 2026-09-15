export function createBattleAudio() {
  let context
  let master
  let muted = false
  let noise

  function unlock() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      context = new AudioContext()
      master = context.createGain()
      master.gain.value = muted ? 0 : 0.24
      master.connect(context.destination)
      noise = context.createBuffer(1, context.sampleRate * 0.4, context.sampleRate)
      const data = noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    }
    context.resume().catch(() => {})
  }

  function tone(frequency, duration, type = 'sine', gain = 0.25, delay = 0) {
    if (!context || muted) return
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    const start = context.currentTime + delay
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, frequency * 0.65), start + duration)
    envelope.gain.setValueAtTime(0.001, start)
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.01)
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration)
    oscillator.connect(envelope)
    envelope.connect(master)
    oscillator.start(start)
    oscillator.stop(start + duration)
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect() }
  }

  function rustle(frequency, duration, gain) {
    if (!context || muted) return
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const envelope = context.createGain()
    source.buffer = noise
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = 0.5
    envelope.gain.setValueAtTime(gain, context.currentTime)
    envelope.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)
    source.connect(filter)
    filter.connect(envelope)
    envelope.connect(master)
    source.start()
    source.stop(context.currentTime + duration)
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect() }
  }

  return {
    unlock,
    setMuted(value) {
      muted = value
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.24, context.currentTime, 0.03)
    },
    play(name) {
      if (name === 'swing') rustle(1400, 0.19, 0.5)
      if (name === 'hit') { tone(140, 0.12, 'triangle', 0.65); rustle(2900, 0.1, 0.35) }
      if (name === 'hurt') tone(65, 0.25, 'sawtooth', 0.24)
      if (name === 'dodge') rustle(700, 0.25, 0.3)
      if (name === 'jump') rustle(900, 0.14, 0.17)
      if (name === 'land') { rustle(220, 0.12, 0.23); tone(76, 0.09, 'triangle', 0.1) }
      if (name === 'step') rustle(260, 0.045, 0.12)
      if (name === 'heal') [440, 554, 660].forEach((f, i) => tone(f, 0.5, 'sine', 0.15, i * 0.1))
      if (name === 'kill') { tone(98, 0.35, 'triangle', 0.35); tone(294, 0.4, 'sine', 0.12) }
      if (name === 'victory') [220, 330, 440, 554, 660].forEach((f, i) => tone(f, 1.2, 'sine', 0.2, i * 0.18))
    },
    dispose() {
      context?.close().catch(() => {})
      context = null
    },
  }
}
