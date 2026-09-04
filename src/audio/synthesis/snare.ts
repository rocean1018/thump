import type { SoundRecipe } from '../../types';
import { mulberry32, randRange } from '../rng';
import { applyAD, lerp, makeDistortion, makeGritBlend, makeNoiseBuffer, noiseSource, resonanceToQ } from './common';

/**
 * Trap snares are snap-first: a short, bright noise crack carries the sound,
 * with only a thin tonal body underneath — not the long, warm "boom-bap" thump
 * of a full acoustic-style snare. Measuring a reference kit's closed/tight
 * snares showed a full decay (peak to -40dB) mostly landing around 45-90ms —
 * tighter than earlier assumed — so the default sits closer to that now.
 */
function snareDecaySec(decayParam: number): number {
  const eased = Math.pow(decayParam, 2.3);
  return lerp(0.03, 0.32, eased);
}

/** Short tonal body (the "shell") plus a dominant bandpassed noise "snap". */
export function synthesizeSnare(ctx: OfflineAudioContext, recipe: SoundRecipe): void {
  const { params, basePitchHz } = recipe;
  const rng = mulberry32(recipe.seed);
  const t0 = 0.001;

  const attackSec = lerp(0.0005, 0.006, params.attack);
  const decaySec = snareDecaySec(params.decay);

  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  const distNode = params.distortion > 0.02 ? makeDistortion(ctx, params.distortion) : null;
  if (distNode) distNode.connect(master);
  const preColor = makeGritBlend(ctx, params.grit, distNode ?? master);

  // Thin tonal body — present for pitch reference, not for weight.
  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.value = basePitchHz * randRange(rng, 0.97, 1.03);
  const bodyGain = ctx.createGain();
  body.connect(bodyGain);
  bodyGain.connect(preColor);
  applyAD(bodyGain, t0, 0.28 + 0.1 * params.punch, attackSec, decaySec * 0.3, 'exp');
  body.start(t0);
  body.stop(t0 + decaySec * 0.5 + 0.05);

  // Snare wires: bandpassed noise carries most of the sound's energy — bright, forward, snappy.
  const noiseDur = decaySec + 0.06;
  const noiseBuf = makeNoiseBuffer(ctx, noiseDur, rng);
  const noise = noiseSource(ctx, noiseBuf);
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = lerp(1800, 6500, params.tone);
  bandpass.Q.value = resonanceToQ(params.resonance, 0.5, 12);
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = lerp(900, 2600, params.tone);
  const noiseGain = ctx.createGain();
  noise.connect(bandpass);
  bandpass.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(preColor);
  applyAD(noiseGain, t0, 0.75 + 0.35 * params.punch, attackSec, decaySec, 'exp');
  noise.start(t0);
  noise.stop(t0 + noiseDur);

  // Extra transient crack on top for punch — the "snap" trap snares lean on.
  if (params.punch > 0.05) {
    const crackDur = 0.02;
    const crackBuf = makeNoiseBuffer(ctx, crackDur, rng);
    const crack = noiseSource(ctx, crackBuf);
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.value = lerp(2500, 5000, params.tone);
    const crackGain = ctx.createGain();
    crack.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(preColor);
    applyAD(crackGain, t0, 0.5 * params.punch, 0.0004, 0.012, 'exp');
    crack.start(t0);
    crack.stop(t0 + crackDur);
  }
}

export function makeSnareRecipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  const durationSec = snareDecaySec(params.decay) + 0.15;
  return { id: `snare-${seed}`, instrument: 'snare', seed, params, basePitchHz, durationSec };
}
