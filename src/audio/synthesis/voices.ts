import type { Instrument, SoundRecipe } from '../../types';
import { decayTime, getCharacter } from '../characters';
import { mulberry32, randRange } from '../rng';
import { lerp, makeNoiseBuffer } from './common';

const START = .001;

export function voiceRecipe(instrument: Instrument, seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  const d = decayTime(instrument, params.decay);
  return { id: instrument + '-' + seed, instrument, seed, basePitchHz, params,
    durationSec: d * (instrument === '808' ? 1.25 : 1) + .1, engineVersion: 3 };
}

/** Exact-zero, -60dB decay envelope. Every layer has its own envelope. */
function envelope(ctx: BaseAudioContext, destination: AudioNode, level: number, attack: number, decay: number, start = START, hold = 0) {
  const node = ctx.createGain(); node.connect(destination);
  if (level <= 0) { node.gain.value = 0; return node; }
  node.gain.setValueAtTime(0, 0);
  node.gain.setValueAtTime(0, start);
  node.gain.linearRampToValueAtTime(level, start + attack);
  node.gain.setValueAtTime(level, start + attack + hold);
  node.gain.exponentialRampToValueAtTime(Math.max(.000001, level * .001), start + attack + hold + decay);
  node.gain.linearRampToValueAtTime(0, start + attack + hold + decay + .015);
  return node;
}
/** Audible body followed by a release, rather than losing 95% of energy in the first 20%.
 * The same decay endpoint remains meaningful when refining or fitting a reference. */
function weightEnvelope(ctx: BaseAudioContext, destination: AudioNode, peak: number, attack: number, decay: number, weight: number, start = START) {
  const node = ctx.createGain(); node.connect(destination);
  if (peak <= 0) { node.gain.value = 0; return node; }
  const g = node.gain, onset = start + attack;
  g.setValueAtTime(0, 0); g.setValueAtTime(0, start);
  g.linearRampToValueAtTime(peak, onset);
  g.exponentialRampToValueAtTime(peak * (.65 + weight * .3), onset + decay * .09);
  g.exponentialRampToValueAtTime(peak * weight, onset + decay * .48);
  g.exponentialRampToValueAtTime(peak * .001, onset + decay);
  g.linearRampToValueAtTime(0, onset + decay + .015);
  return node;
}
function filter(ctx: BaseAudioContext, destination: AudioNode, type: BiquadFilterType, hz: number, q = .707) {
  const node = ctx.createBiquadFilter(); node.type = type; node.frequency.value = hz; node.Q.value = q; node.connect(destination); return node;
}
function oscillator(ctx: BaseAudioContext, destination: AudioNode, type: OscillatorType, frequency: number, stop: number, detune = 0) {
  const node = ctx.createOscillator(); node.type = type; node.frequency.value = frequency;
  node.detune.value = detune; node.connect(destination); node.start(START); node.stop(stop); return node;
}
function noise(ctx: BaseAudioContext, destination: AudioNode, duration: number, seed: number, start = START) {
  const node = ctx.createBufferSource(); node.buffer = makeNoiseBuffer(ctx, duration, mulberry32(seed));
  node.connect(destination); node.start(start); node.stop(start + duration); return node;
}
function level(ctx: BaseAudioContext, destination: AudioNode, value: number) {
  const node = ctx.createGain(); node.gain.value = value; node.connect(destination); return node;
}
/** A true dry/wet nonlinear stage. Put it BEFORE the bass amp envelope so long tails keep their texture. */
function color(ctx: BaseAudioContext, destination: AudioNode, amount: number, hard = false) {
  if (amount <= .001) return destination;
  const input = ctx.createGain();
  input.connect(level(ctx, destination, 1 - amount));
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(4097), drive = 1 + amount * 24;
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1) * 2 - 1) * drive;
    curve[i] = hard ? Math.max(-1, Math.min(1, x)) : Math.tanh(x) / Math.tanh(drive);
  }
  shaper.curve = curve; shaper.oversample = '4x';
  input.connect(shaper); shaper.connect(level(ctx, destination, amount));
  return input;
}
function noiseColor(ctx: BaseAudioContext, destination: AudioNode, grit: number) {
  if (grit < .03) return destination;
  const shaper = ctx.createWaveShaper(), curve = new Float32Array(4097);
  const steps = 2 ** Math.round(12 - grit * 9);
  for (let i = 0; i < curve.length; i++) {
    const x = i / (curve.length - 1) * 2 - 1;
    curve[i] = x * (1 - grit) + Math.round(x * steps) / steps * grit;
  }
  shaper.curve = curve; shaper.connect(destination); return shaper;
}

export function bassVoice(ctx: OfflineAudioContext, recipe: SoundRecipe) {
  const p = recipe.params, c = getCharacter('808', recipe.character);
  const d = decayTime('808', p.decay), a = lerp(.035, .0005, p.attack);
  const hold = c.id === '808-sub' || c.id === '808-reese' ? d * .18 : d * .025;
  const amp = c.id === '808-sub'
    ? envelope(ctx, ctx.destination, .8, a, d, START, hold)
    : weightEnvelope(ctx, ctx.destination, .8, a, d, c.weight ?? .58);
  const lowpass = filter(ctx, amp, 'lowpass', 220 * (14000 / 220) ** p.tone, .55 + p.resonance * 1.2);
  if (c.partials) {
    const cutoff = lowpass.frequency.value;
    lowpass.frequency.setValueAtTime(Math.min(14000, cutoff * 2.2), START);
    lowpass.frequency.exponentialRampToValueAtTime(cutoff, START + d * .5);
  }
  const drive = color(ctx, noiseColor(ctx, lowpass, p.grit), p.distortion, c.hardClip);
  const f = recipe.basePitchHz;
  const body = oscillator(ctx, level(ctx, drive, .85), 'sine', f, recipe.durationSec);
  // Keep a phase-locked clean low end underneath drive; distortion adds character,
  // rather than replacing all the fundamental with a buzzy midrange oscillator.
  if (c.id !== '808-sub') body.connect(level(ctx, amp, .28));
  const sweep = 1 + ((c.sweep ?? 2) - 1) * p.punch;
  const slide = c.slide ?? 0;
  for (const [osc, ratio] of [[body, 1]] as const) {
    osc.frequency.setValueAtTime(f * ratio * sweep * 2 ** (slide / 12), START);
    osc.frequency.exponentialRampToValueAtTime(f * ratio * 2 ** (slide / 12), START + .012 + (1-p.punch)*.015);
    if (slide) osc.frequency.exponentialRampToValueAtTime(f * ratio, START + Math.max(.1, d * .8));
  }
  const harmonicMix = (c.partials ? .85 : c.harmonics ?? 0) * (.3 + p.tone * 1.5);
  if (harmonicMix > 0) {
    const voices = c.detune ? [-c.detune, c.detune] : [0];
    for (const detune of voices) {
      const osc = oscillator(ctx, level(ctx, drive, harmonicMix / voices.length), c.wave ?? 'triangle', f, recipe.durationSec, detune);
      if (c.partials) {
        const real = new Float32Array(c.partials.length + 1);
        const imaginary = new Float32Array(c.partials.length + 1);
        // No duplicate fundamental; the phase-locked sine above carries the weight.
        c.partials.forEach((amplitude, i) => { if (i > 0) imaginary[i + 1] = amplitude; });
        osc.setPeriodicWave(ctx.createPeriodicWave(real, imaginary, { disableNormalization: true }));
      }
      osc.frequency.setValueAtTime(f * sweep * 2 ** (slide / 12), START);
      osc.frequency.exponentialRampToValueAtTime(f * 2 ** (slide / 12), START + .022);
      if (slide) osc.frequency.exponentialRampToValueAtTime(f, START + Math.max(.1, d * .8));
    }
  }
  const clickAmount = (c.click ?? .1) * p.punch;
  if (clickAmount > .001) {
    const e = envelope(ctx, ctx.destination, clickAmount, .0004, .015);
    noise(ctx, filter(ctx, e, 'bandpass', lerp(900, 3500, p.tone)), .04, recipe.seed ^ 83);
  }
}

export function kickVoice(ctx: OfflineAudioContext, recipe: SoundRecipe) {
  const p = recipe.params, c = getCharacter('kick', recipe.character), rng = mulberry32(recipe.seed);
  const d = decayTime('kick', p.decay), a = lerp(.025, .0004, p.attack);
  const amp = weightEnvelope(ctx, ctx.destination, .9, a, d, .32);
  const tone = filter(ctx, amp, 'lowpass', 450 * (12000/450) ** p.tone, .6 + p.resonance);
  const drive = color(ctx, tone, p.distortion, c.hardClip);
  const body = oscillator(ctx, level(ctx, drive, c.body ?? 1), 'sine', recipe.basePitchHz, recipe.durationSec);
  body.frequency.setValueAtTime(recipe.basePitchHz * (1 + (c.sweep ?? 4) * p.punch) * randRange(rng,.96,1.04), START);
  body.frequency.exponentialRampToValueAtTime(recipe.basePitchHz, START + lerp(.055,.014,p.punch));
  // Upper knock gives kicks presence above the sub bass instead of duplicating an 808.
  const knock = weightEnvelope(ctx, drive, .25 * p.punch, a, Math.min(d,.085), .25);
  oscillator(ctx, knock, 'triangle', recipe.basePitchHz * 2.07, .15);
  const e = envelope(ctx, ctx.destination, (c.click ?? .3) * (.2 + p.punch), .0004, .006 + p.tone * .01);
  noise(ctx, filter(ctx, e, 'bandpass', 800 * 7 ** p.tone, .8), .04, recipe.seed ^ 773);
}

export function hatVoice(ctx: OfflineAudioContext, recipe: SoundRecipe) {
  const p = recipe.params, c = getCharacter('hihat', recipe.character);
  const d = decayTime('hihat', p.decay), a = lerp(.014,.0003,p.attack);
  const amp = weightEnvelope(ctx, ctx.destination, .8, a, d, c.id === 'hat-open' ? .3 : .22);
  const low = filter(ctx, amp, 'lowpass', 5500 * (15500/5500) ** p.tone, .55);
  const high = filter(ctx, low, 'highpass', 1800 + 2600 * p.tone, .65);
  const drive = color(ctx, noiseColor(ctx, high, p.grit), p.distortion);
  // Noise follows the WHOLE open-hat envelope, not a 40ms burst on every preset.
  noise(ctx, level(ctx, drive, c.noise ?? .8), recipe.durationSec, recipe.seed ^ 529);
  const metallic = filter(ctx, level(ctx, drive, (c.body ?? .2) / 6), 'bandpass', 5500 + p.tone * 4500, .8 + p.resonance * 3);
  const rng = mulberry32(recipe.seed);
  for (const ratio of [1,1.342,1.539,1.788,2.116,2.257]) {
    oscillator(ctx, metallic, 'square', recipe.basePitchHz * ratio * randRange(rng,.97,1.03), recipe.durationSec);
  }
  // Short stick/contact band gives definition without making the whole hat a hiss.
  const contact = envelope(ctx, amp, .32 * p.punch, .0003, Math.min(d, .022));
  noise(ctx, filter(ctx, contact, 'bandpass', 2800 + p.tone * 1600, 1.4), .04, recipe.seed ^ 1297);
}

export function snareVoice(ctx: OfflineAudioContext, recipe: SoundRecipe) {
  const p = recipe.params, c = getCharacter('snare', recipe.character);
  const d = decayTime('snare', p.decay), a = lerp(.018,.0004,p.attack);
  const master = color(ctx, ctx.destination, p.distortion, c.hardClip);
  const ratios = c.rim ? [1,1.47,2.09] : [1,1.59];
  ratios.forEach((ratio,i) => {
    const body = weightEnvelope(ctx, master, (c.body ?? .3) / (i + 1), a, c.rim ? Math.min(.11,d) / (1+i*.3) : d * .72, c.rim ? .18 : .32);
    const osc = oscillator(ctx, body, 'sine', recipe.basePitchHz * ratio, recipe.durationSec);
    osc.frequency.setValueAtTime(recipe.basePitchHz * ratio * (1 + .12 * p.punch),START);
    osc.frequency.exponentialRampToValueAtTime(recipe.basePitchHz * ratio,START+.012);
  });
  const burstTimes = c.clap ? [0,.011,.024] : [0];
  burstTimes.forEach((offset,i) => {
    const tail = c.clap && i < 2 ? .009 : d;
    const amp = weightEnvelope(ctx, master, (c.noise ?? .9) * (c.clap ? .75 : .8), a, tail, c.clap ? .28 : .2, START+offset);
    const low = filter(ctx, amp, 'lowpass', 3200 * 4 ** p.tone, .7);
    const high = filter(ctx, low, 'highpass', c.rim ? 1800 : c.clap ? 650 : 850, .7);
    noise(ctx, noiseColor(ctx, high, p.grit), tail+.04, recipe.seed ^ (419+i*787), START+offset);
  });
  if (!c.rim) {
    // Independently damped shell/wire resonance: weight between the pitched body
    // and bright noise, which previously left a hollow gap in the snare spectrum.
    const wire = weightEnvelope(ctx, master, c.clap ? .12 : .2, a, d * .65, .24);
    noise(ctx, filter(ctx, wire, 'bandpass', c.clap ? 1200 : 1650, 1.1 + p.resonance), d + .04, recipe.seed ^ 617);
  }
  if (c.click) {
    const amp = envelope(ctx, master, c.click * p.punch, .0003, .008);
    noise(ctx, filter(ctx, amp,'bandpass',2000+p.tone*4000,.7),.025,recipe.seed^1009);
  }
}
