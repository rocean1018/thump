import type { SoundRecipe } from '../../types';
import { mulberry32, randRange } from '../rng';
import { applyAD, clamp, lerp, makeDistortion, makeGritBlend, makeNoiseBuffer, noiseSource, resonanceToQ } from './common';

// Classic inharmonic ratio bank (TR-808-style metallic hi-hat), jittered per-seed
// so each variation has an audibly different metallic character.
const RATIOS = [1, 1.342, 1.539, 1.788, 2.116, 2.257];

/**
 * Trap hats live and die by decay: most of the useful range should be a tight,
 * closed "tick" (20-150ms). Only the top of the slider should open it up into a
 * ringing open hat. A cubic ease keeps the default (0.5) short and closed.
 */
function hihatDecaySec(decayParam: number): number {
  const eased = decayParam * decayParam * decayParam;
  return lerp(0.018, 0.55, eased);
}

/** Bank of detuned square oscillators (metallic ring) + tightly filtered noise, fast envelope. */
export function synthesizeHihat(ctx: OfflineAudioContext, recipe: SoundRecipe): void {
  const { params, basePitchHz } = recipe;
  const rng = mulberry32(recipe.seed);
  const t0 = 0.001;

  const attackSec = lerp(0.006, 0.0004, params.attack);
  const decaySec = hihatDecaySec(params.decay);

  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  const distNode = params.distortion > 0.02 ? makeDistortion(ctx, params.distortion * 0.6) : null;
  if (distNode) distNode.connect(master);
  const preColor = makeGritBlend(ctx, params.grit, distNode ?? master);

  // Trap hats are thin and bright — push the whole thing through a tight
  // highpass/bandpass stack so there's no low-mid "wash" left in the tail.
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = lerp(5500, 11000, params.tone);
  highpass.Q.value = 0.6;
  highpass.connect(preColor);

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = lerp(7500, 12500, params.tone);
  bandpass.Q.value = resonanceToQ(params.resonance, 0.6, 16);
  bandpass.connect(highpass);

  const ringGain = ctx.createGain();
  ringGain.connect(bandpass);
  applyAD(ringGain, t0, 0.4 + 0.25 * params.punch, attackSec, decaySec, 'exp');

  const ratioJitter = randRange(rng, 0.94, 1.06);
  for (const ratio of RATIOS) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = basePitchHz * ratio * ratioJitter * randRange(rng, 0.98, 1.02);
    osc.connect(ringGain);
    osc.start(t0);
    osc.stop(t0 + decaySec + 0.08);
  }

  // A short burst of filtered noise gives the onset its "tsst" — kept brief so
  // it reinforces the tick instead of turning into an airy hiss tail.
  const noiseDur = Math.min(decaySec, 0.05) + 0.03;
  const noiseBuf = makeNoiseBuffer(ctx, noiseDur, rng);
  const noise = noiseSource(ctx, noiseBuf);
  const noiseGain = ctx.createGain();
  noise.connect(noiseGain);
  noiseGain.connect(highpass);
  applyAD(noiseGain, t0, 0.3 + 0.2 * params.punch, attackSec, Math.min(decaySec, 0.04), 'exp');
  noise.start(t0);
  noise.stop(t0 + noiseDur);
}

export function makeHihatRecipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  const durationSec = hihatDecaySec(params.decay) + 0.12;
  return { id: `hihat-${seed}`, instrument: 'hihat', seed, params, basePitchHz, durationSec };
}
