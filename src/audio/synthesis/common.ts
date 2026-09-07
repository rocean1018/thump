/**
 * Shared DSP building blocks used by every instrument engine. Each engine builds
 * a small offline graph (OfflineAudioContext) and renders it to an AudioBuffer.
 */

export function makeOfflineCtx(durationSec: number, sampleRate = 44100): OfflineAudioContext {
  const length = Math.max(1, Math.ceil(durationSec * sampleRate));
  return new OfflineAudioContext(1, length, sampleRate);
}

/** Exponential-feeling saturation curve for WaveShaperNode. amount: 0..1 */
export function makeDistortionCurve(amount: number, samples = 1024): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(samples);
  const k = amount * amount * 12; // low settings preserve dynamics; high settings add weight
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

export function makeDistortion(ctx: BaseAudioContext, amount: number): WaveShaperNode {
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeDistortionCurve(amount);
  shaper.oversample = '4x';
  return shaper;
}

/**
 * Amplitude-quantization ("bitcrush") curve — a staircase, not a smooth curve.
 * Sonically distinct from makeDistortionCurve: that's harmonic saturation
 * (clipping), this is aliasing/quantization grit — the "dusty tape" / "crushed"
 * character rather than "driven" character. amount: 0..1.
 */
export function makeBitcrushCurve(amount: number, samples = 1024): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(samples);
  const steps = Math.round(lerp(256, 5, amount)); // fewer steps = more crushed
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  return curve;
}

/**
 * Grit as a wet/dry blend rather than a 100%-wet insert. This matters a lot on
 * anything with a long exponential decay (808s especially): a pure bitcrush
 * quantizes to a fixed absolute step size, so as the signal decays toward
 * silence it eventually becomes *mostly* quantization steps — the tail turns
 * into an audible "robotic" stairstep buzz instead of fading smoothly. Blending
 * in a dry path means the tail always has a smooth component underneath the
 * crunch, however far it's decayed. Returns the node to connect sources into;
 * wires its output to `destination` internally.
 */
export function makeGritBlend(ctx: BaseAudioContext, amount: number, destination: AudioNode): AudioNode {
  const input = ctx.createGain();
  if (amount <= 0.03) {
    input.connect(destination);
    return input;
  }
  const dry = ctx.createGain();
  dry.gain.value = 1 - amount * 0.7;
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeBitcrushCurve(amount);
  shaper.oversample = 'none'; // oversampling would smooth out the very aliasing we want
  const wet = ctx.createGain();
  wet.gain.value = amount * 0.7;

  input.connect(dry);
  input.connect(shaper);
  shaper.connect(wet);
  dry.connect(destination);
  wet.connect(destination);
  return input;
}

/** Maps the 0..1 "resonance" creative param onto a biquad Q range. */
export function resonanceToQ(resonance: number, min = 0.5, max = 14): number {
  return lerp(min, max, resonance * resonance);
}

/** White noise buffer, optionally decaying, rendered once and reused as a source. */
export function makeNoiseBuffer(ctx: BaseAudioContext, durationSec: number, rng: () => number): AudioBuffer {
  const length = Math.max(1, Math.ceil(durationSec * ctx.sampleRate));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = rng() * 2 - 1;
  }
  return buffer;
}

export function noiseSource(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

/** Apply a standard AD envelope (no sustain/release — one-shots don't hold). */
export function applyAD(
  gain: GainNode,
  startTime: number,
  peak: number,
  attackSec: number,
  decaySec: number,
  curve: 'exp' | 'lin' = 'exp'
): void {
  const g = gain.gain;
  const a = Math.max(0.0003, attackSec);
  const d = Math.max(0.005, decaySec);
  g.cancelScheduledValues(startTime);
  g.setValueAtTime(0.0001, startTime);
  g.linearRampToValueAtTime(peak, startTime + a);
  if (curve === 'exp') {
    g.setTargetAtTime(0.0001, startTime + a, d / 4);
  } else {
    g.linearRampToValueAtTime(0.0001, startTime + a + d);
  }
}

/**
 * Two-stage "punch then sustain" envelope. A single exponential decay (applyAD)
 * doesn't match how real 808s/kicks actually behave: measuring a reference kit
 * showed a sharp initial drop from the peak down to a lower level within
 * ~2-30ms (the "punch"), followed by a much slower decay of that sustained
 * level over hundreds of ms to a few seconds (the "tail"). Modeling both
 * stages reads as far more like a real drum than one smooth fade.
 */
export function applyPunchDecay(
  gain: GainNode,
  startTime: number,
  peak: number,
  attackSec: number,
  punchDecaySec: number,
  sustainFrac: number,
  tailDecaySec: number
): void {
  const g = gain.gain;
  const a = Math.max(0.0015, attackSec);
  const punchTau = Math.max(0.001, punchDecaySec / 4);
  const kneeTime = startTime + a + punchDecaySec;
  g.cancelScheduledValues(startTime);
  g.setValueAtTime(0.0001, startTime);
  g.linearRampToValueAtTime(peak, startTime + a);
  g.setTargetAtTime(peak * sustainFrac, startTime + a, punchTau);
  g.setTargetAtTime(0.0001, kneeTime, Math.max(0.01, tailDecaySec / 4));
}

/** Pitch envelope: quick glide from startHz down/up to endHz over glideSec. */
export function applyPitchGlide(
  osc: OscillatorNode,
  startTime: number,
  startHz: number,
  endHz: number,
  glideSec: number
): void {
  const f = osc.frequency;
  f.cancelScheduledValues(startTime);
  f.setValueAtTime(Math.max(1, startHz), startTime);
  f.exponentialRampToValueAtTime(Math.max(1, endHz), startTime + Math.max(0.001, glideSec));
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Renders an offline graph and returns a peak-normalized-safe AudioBuffer (no clipping headroom applied here — see normalize.ts). */
export async function render(ctx: OfflineAudioContext): Promise<AudioBuffer> {
  return ctx.startRendering();
}
