import type { SoundRecipe } from '../../types';
import { mulberry32, randRange } from '../rng';
import { applyAD, applyPitchGlide, clamp, lerp, makeDistortion, makeNoiseBuffer, noiseSource } from './common';

/** Kick: like the 808 but shorter, punchier, with a stronger click and shorter tail. */
export function synthesizeKick(ctx: OfflineAudioContext, recipe: SoundRecipe): void {
  const { params, basePitchHz, durationSec } = recipe;
  const rng = mulberry32(recipe.seed);
  const t0 = 0.001;

  const attackSec = lerp(0.0008, 0.02, params.attack);
  const decaySec = lerp(0.08, clamp(durationSec - attackSec - 0.03, 0.1, 0.6), params.decay);
  const glideAmount = lerp(2, 7, params.punch) * randRange(rng, 0.9, 1.1);
  const glideSec = lerp(0.01, 0.06, 1 - params.punch * 0.5) * randRange(rng, 0.85, 1.15);

  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  const shaper = params.distortion > 0.02 ? makeDistortion(ctx, params.distortion) : null;
  const preDist = shaper ?? master;
  if (shaper) shaper.connect(master);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = lerp(900, 8500, params.tone);
  lowpass.Q.value = 0.7;
  lowpass.connect(preDist);

  const body = ctx.createOscillator();
  body.type = 'sine';
  const bodyGain = ctx.createGain();
  body.connect(bodyGain);
  bodyGain.connect(lowpass);
  applyPitchGlide(body, t0, basePitchHz * glideAmount, basePitchHz, glideSec);
  applyAD(bodyGain, t0, 1, attackSec, decaySec, 'exp');
  body.start(t0);
  body.stop(t0 + decaySec + 0.25);

  // Beater/click transient — kicks lean on this more than 808s do.
  const noiseBuf = makeNoiseBuffer(ctx, 0.025, rng);
  const click = noiseSource(ctx, noiseBuf);
  const clickFilter = ctx.createBiquadFilter();
  clickFilter.type = 'bandpass';
  clickFilter.frequency.value = lerp(1200, 4200, params.tone) * randRange(rng, 0.95, 1.05);
  clickFilter.Q.value = 1.1;
  const clickGain = ctx.createGain();
  click.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(lowpass);
  applyAD(clickGain, t0, 0.35 + 0.55 * params.punch, 0.0008, 0.015, 'exp');
  click.start(t0);
  click.stop(t0 + 0.03);
}

export function makeKickRecipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  const durationSec = lerp(0.25, 0.85, params.decay) + 0.2;
  return { id: `kick-${seed}`, instrument: 'kick', seed, params, basePitchHz, durationSec };
}
