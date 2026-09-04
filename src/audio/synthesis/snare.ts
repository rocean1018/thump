import type { SoundRecipe } from '../../types';
import { mulberry32, randRange } from '../rng';
import { applyAD, clamp, lerp, makeDistortion, makeNoiseBuffer, noiseSource } from './common';

/** Snare: short tonal body (the "shell") plus bandpassed noise (the "snap/snare wires"). */
export function synthesizeSnare(ctx: OfflineAudioContext, recipe: SoundRecipe): void {
  const { params, basePitchHz, durationSec } = recipe;
  const rng = mulberry32(recipe.seed);
  const t0 = 0.001;

  const attackSec = lerp(0.0008, 0.012, params.attack);
  const decaySec = lerp(0.06, clamp(durationSec - attackSec - 0.03, 0.08, 0.5), params.decay);

  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  const shaper = params.distortion > 0.02 ? makeDistortion(ctx, params.distortion) : null;
  const preDist = shaper ?? master;
  if (shaper) shaper.connect(master);

  // Tonal body.
  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.value = basePitchHz * randRange(rng, 0.97, 1.03);
  const bodyGain = ctx.createGain();
  body.connect(bodyGain);
  bodyGain.connect(preDist);
  applyAD(bodyGain, t0, 0.55 + 0.2 * params.punch, attackSec, decaySec * 0.6, 'exp');
  body.start(t0);
  body.stop(t0 + decaySec + 0.1);

  // Snare wires: bandpassed noise, brightness set by tone, length by decay.
  const noiseDur = decaySec + 0.12;
  const noiseBuf = makeNoiseBuffer(ctx, noiseDur, rng);
  const noise = noiseSource(ctx, noiseBuf);
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = lerp(1400, 6500, params.tone);
  bandpass.Q.value = 0.6;
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = lerp(600, 2200, params.tone);
  const noiseGain = ctx.createGain();
  noise.connect(bandpass);
  bandpass.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(preDist);
  applyAD(noiseGain, t0, 0.6 + 0.35 * params.punch, attackSec, decaySec, 'exp');
  noise.start(t0);
  noise.stop(t0 + noiseDur);
}

export function makeSnareRecipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  const durationSec = lerp(0.16, 0.55, params.decay) + 0.2;
  return { id: `snare-${seed}`, instrument: 'snare', seed, params, basePitchHz, durationSec };
}
