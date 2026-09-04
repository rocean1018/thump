import type { SoundRecipe } from '../../types';
import { mulberry32, randRange } from '../rng';
import {
  applyAD,
  applyPitchGlide,
  chainNodes,
  clamp,
  lerp,
  makeDistortion,
  makeGrit,
  makeNoiseBuffer,
  noiseSource,
  resonanceToQ,
} from './common';

/**
 * 808: sine-dominant sub with a short pitched "pluck" glide down to the
 * fundamental, an optional harmonic layer for brightness, and a long tail.
 */
export function synthesize808(ctx: OfflineAudioContext, recipe: SoundRecipe): void {
  const { params, basePitchHz, durationSec } = recipe;
  const rng = mulberry32(recipe.seed);
  const t0 = 0.001;

  const attackSec = lerp(0.001, 0.035, params.attack);
  const decaySec = lerp(0.25, clamp(durationSec - attackSec - 0.05, 0.3, 3.5), params.decay);
  const glideAmount = lerp(1.6, 5.5, params.punch) * randRange(rng, 0.9, 1.1);
  const glideSec = lerp(0.015, 0.09, 1 - params.punch * 0.6) * randRange(rng, 0.85, 1.15);

  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  const colorNodes: AudioNode[] = [];
  if (params.grit > 0.03) colorNodes.push(makeGrit(ctx, params.grit));
  if (params.distortion > 0.02) colorNodes.push(makeDistortion(ctx, params.distortion));
  const preColor = chainNodes(colorNodes, master);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = lerp(700, 9000, params.tone);
  lowpass.Q.value = resonanceToQ(params.resonance, 0.5, 9);
  lowpass.connect(preColor);

  // Body: sine with pitch glide.
  const body = ctx.createOscillator();
  body.type = 'sine';
  const bodyGain = ctx.createGain();
  body.connect(bodyGain);
  bodyGain.connect(lowpass);
  applyPitchGlide(body, t0, basePitchHz * glideAmount, basePitchHz, glideSec);
  applyAD(bodyGain, t0, 0.9, attackSec, decaySec, 'exp');
  body.start(t0);
  body.stop(t0 + decaySec + 0.6);

  // Harmonic layer for tone/brightness — a quiet triangle an octave up, faster decay.
  if (params.tone > 0.15) {
    const harm = ctx.createOscillator();
    harm.type = 'triangle';
    const harmGain = ctx.createGain();
    harm.connect(harmGain);
    harmGain.connect(lowpass);
    applyPitchGlide(harm, t0, basePitchHz * glideAmount * 2, basePitchHz * 2, glideSec * 0.8);
    applyAD(harmGain, t0, 0.18 * params.tone, attackSec, decaySec * 0.35, 'exp');
    harm.start(t0);
    harm.stop(t0 + decaySec * 0.5 + 0.2);
  }

  // Click transient for punch.
  if (params.punch > 0.05) {
    const noiseBuf = makeNoiseBuffer(ctx, 0.02, rng);
    const click = noiseSource(ctx, noiseBuf);
    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = lerp(800, 2600, params.tone);
    clickFilter.Q.value = 0.9;
    const clickGain = ctx.createGain();
    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(lowpass);
    applyAD(clickGain, t0, 0.5 * params.punch, 0.001, 0.02, 'exp');
    click.start(t0);
    click.stop(t0 + 0.03);
  }
}

export function make808Recipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  const durationSec = lerp(0.6, 3.6, params.decay) + 0.4;
  return { id: `808-${seed}`, instrument: '808', seed, params, basePitchHz, durationSec };
}
