import type { SoundRecipe } from '../../types';
import { mulberry32, randRange } from '../rng';
import {
  applyAD,
  applyPitchGlide,
  applyPunchDecay,
  clamp,
  lerp,
  makeDistortion,
  makeGritBlend,
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
  // Measured from a reference kit: real 808s drop from peak to ~30% within a
  // few ms to tens of ms (the "punch"), then decay that sustained level over a
  // much longer tail — not one smooth exponential from the peak.
  const punchDecaySec = lerp(0.03, 0.006, params.punch) * randRange(rng, 0.85, 1.15);
  const sustainFrac = lerp(0.4, 0.22, params.punch);
  const tailDecaySec = lerp(0.25, clamp(durationSec - attackSec - 0.05, 0.3, 3.5), params.decay);
  const glideAmount = lerp(1.6, 5.5, params.punch) * randRange(rng, 0.9, 1.1);
  const glideSec = lerp(0.015, 0.09, 1 - params.punch * 0.6) * randRange(rng, 0.85, 1.15);

  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  const distNode = params.distortion > 0.02 ? makeDistortion(ctx, params.distortion) : null;
  if (distNode) distNode.connect(master);
  const preColor = makeGritBlend(ctx, params.grit, distNode ?? master);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = lerp(700, 9000, params.tone);
  // Capped well below hihat/snare's range — a self-ringing filter under a
  // sweeping sub pitch glide reads as a sci-fi "laser" whistle, not a boomy 808.
  lowpass.Q.value = resonanceToQ(params.resonance, 0.5, 4);
  lowpass.connect(preColor);

  // Body: sine with pitch glide.
  const body = ctx.createOscillator();
  body.type = 'sine';
  const bodyGain = ctx.createGain();
  body.connect(bodyGain);
  bodyGain.connect(lowpass);
  applyPitchGlide(body, t0, basePitchHz * glideAmount, basePitchHz, glideSec);
  applyPunchDecay(bodyGain, t0, 0.95, attackSec, punchDecaySec, sustainFrac, tailDecaySec);
  body.start(t0);
  body.stop(t0 + punchDecaySec + tailDecaySec + 0.6);

  // Harmonic layer for tone/brightness — a quiet triangle an octave up, faster decay.
  if (params.tone > 0.15) {
    const harm = ctx.createOscillator();
    harm.type = 'triangle';
    const harmGain = ctx.createGain();
    harm.connect(harmGain);
    harmGain.connect(lowpass);
    applyPitchGlide(harm, t0, basePitchHz * glideAmount * 2, basePitchHz * 2, glideSec * 0.8);
    applyAD(harmGain, t0, 0.18 * params.tone, attackSec, tailDecaySec * 0.35, 'exp');
    harm.start(t0);
    harm.stop(t0 + tailDecaySec * 0.5 + 0.2);
  }

  // Click transient for punch — a low-passed thump, not a bandpassed "tick".
  // A reference kit measured real 808 transients concentrated around
  // 60-290Hz, far lower than a bright bandpass click; that low-end thump
  // *is* the punch, layered on top of the envelope's own fast initial drop.
  // Bypasses the resonant lowpass on purpose: a noise impulse hitting a
  // high-Q filter rings at the cutoff frequency instead of just thumping.
  if (params.punch > 0.05) {
    const noiseBuf = makeNoiseBuffer(ctx, 0.03, rng);
    const click = noiseSource(ctx, noiseBuf);
    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'lowpass';
    clickFilter.frequency.value = lerp(110, 340, params.tone) * randRange(rng, 0.9, 1.1);
    clickFilter.Q.value = 0.8;
    const clickGain = ctx.createGain();
    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(preColor);
    applyAD(clickGain, t0, 0.4 * params.punch, 0.001, 0.028, 'exp');
    click.start(t0);
    click.stop(t0 + 0.04);
  }
}

export function make808Recipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  const durationSec = lerp(0.6, 3.6, params.decay) + 0.4;
  return { id: `808-${seed}`, instrument: '808', seed, params, basePitchHz, durationSec };
}
