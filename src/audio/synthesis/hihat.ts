import type { SoundRecipe } from '../../types';
import { mulberry32, randRange } from '../rng';
import { applyAD, clamp, lerp, makeDistortion, makeNoiseBuffer, noiseSource } from './common';

// Classic inharmonic ratio bank (TR-808-style metallic hi-hat), jittered per-seed
// so each variation has a slightly different metallic character.
const RATIOS = [1, 1.342, 1.539, 1.788, 2.116, 2.257];

/** Hi-hat: bank of detuned square oscillators (metallic ring) + filtered noise, fast envelope. */
export function synthesizeHihat(ctx: OfflineAudioContext, recipe: SoundRecipe): void {
  const { params, basePitchHz, durationSec } = recipe;
  const rng = mulberry32(recipe.seed);
  const t0 = 0.001;

  const attackSec = lerp(0.0005, 0.008, params.attack);
  const decaySec = lerp(0.035, clamp(durationSec - attackSec - 0.02, 0.05, 0.7), params.decay);

  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  const shaper = params.distortion > 0.02 ? makeDistortion(ctx, params.distortion * 0.7) : null;
  const preDist = shaper ?? master;
  if (shaper) shaper.connect(master);

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = lerp(3200, 9500, params.tone);
  highpass.Q.value = 0.7;
  highpass.connect(preDist);

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = lerp(6000, 11000, params.tone);
  bandpass.Q.value = 0.5;
  bandpass.connect(highpass);

  const ringGain = ctx.createGain();
  ringGain.connect(bandpass);
  applyAD(ringGain, t0, 0.5 + 0.3 * params.punch, attackSec, decaySec, 'exp');

  for (const ratio of RATIOS) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = basePitchHz * ratio * randRange(rng, 0.985, 1.015);
    osc.connect(ringGain);
    osc.start(t0);
    osc.stop(t0 + decaySec + 0.15);
  }

  // Filtered noise layer adds air/hiss character on top of the metallic ring.
  const noiseBuf = makeNoiseBuffer(ctx, decaySec + 0.1, rng);
  const noise = noiseSource(ctx, noiseBuf);
  const noiseGain = ctx.createGain();
  noise.connect(noiseGain);
  noiseGain.connect(highpass);
  applyAD(noiseGain, t0, 0.35, attackSec, decaySec * 0.9, 'exp');
  noise.start(t0);
  noise.stop(t0 + decaySec + 0.15);
}

export function makeHihatRecipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  // "decay" doubles as closed (low) vs open (high) hi-hat character.
  const durationSec = lerp(0.09, 0.75, params.decay) + 0.15;
  return { id: `hihat-${seed}`, instrument: 'hihat', seed, params, basePitchHz, durationSec };
}
