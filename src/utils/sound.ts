/**
 * Pure Web Audio API Sound Generator
 * Completely self-contained, no external audio files or network requests required.
 */

let audioCtx: AudioContext | null = null;
let ambientSource: AudioNode | null = null;
let ambientGain: GainNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playChime(type: 'start' | 'complete' | 'click' = 'click') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
      return;
    }

    // Chord synthesis
    const freqs = type === 'start' ? [523.25, 659.25, 783.99] : [523.25, 659.25, 783.99, 1046.50];
    const duration = type === 'start' ? 0.6 : 0.9;

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.08, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + duration + 0.1);
    });
  } catch (err) {
    console.warn('Audio playback not supported or user has not interacted with DOM yet', err);
  }
}

export function toggleAmbientNoise(enable: boolean, volume = 0.15) {
  try {
    const ctx = getAudioContext();

    if (!enable) {
      if (ambientGain) {
        ambientGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
        setTimeout(() => {
          if (ambientSource) {
            try {
              (ambientSource as AudioBufferSourceNode).stop();
              ambientSource.disconnect();
            } catch {
              // ignore
            }
            ambientSource = null;
            ambientGain = null;
          }
        }, 300);
      }
      return;
    }

    if (ambientSource) return; // already playing

    // Generate 5 seconds of pink noise in a looped buffer
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.loop = true;

    // Filter to warm deep rain/ocean frequencies
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.5);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start(ctx.currentTime);
    ambientSource = whiteNoise;
    ambientGain = gain;
  } catch (err) {
    console.warn('Ambient noise failed to start', err);
  }
}
