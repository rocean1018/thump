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

// A reference kit's kicks mostly fully decayed within ~0.05-0.19s (a few
// outliers ran much longer — essentially kick+808 combos). A mild ease keeps
// the default in that typical range while still letting the slider reach a
// genuinely long "boomy" kick at the top end.
function kickTailDecaySec(decayParam: number, maxSec: number): number {
  const eased = Math.pow(decayParam, 1.7);
  return lerp(0.035, maxSec, eased);
}

/** Kick: like the 808 but shorter, punchier, with a stronger click and shorter tail. */
export function synthesizeKick(ctx: OfflineAudioContext, recipe: SoundRecipe): void {
  const { params, basePitchHz, durationSec } = recipe;
  const rng = mulberry32(recipe.seed);
  const t0 = 0.001;

  const attackSec = lerp(0.02, 0.0008, params.attack);
  // Same two-stage shape as the 808 (see applyPunchDecay), just faster/deeper —
  // kicks punch harder and settle lower before their (much shorter) tail.
  const punchDecaySec = lerp(0.016, 0.003, params.punch) * randRange(rng, 0.85, 1.15);
  const sustainFrac = lerp(0.32, 0.15, params.punch);
  const tailDecaySec = kickTailDecaySec(params.decay, 0.65);
  const glideAmount = lerp(2, 7, params.punch) * randRange(rng, 0.9, 1.1);
  const glideSec = lerp(0.01, 0.06, 1 - params.punch * 0.5) * randRange(rng, 0.85, 1.15);

  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  const distNode = params.distortion > 0.02 ? makeDistortion(ctx, params.distortion) : null;
  if (distNode) distNode.connect(master);
  const preColor = makeGritBlend(ctx, params.grit, distNode ?? master);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = lerp(900, 8500, params.tone);
  lowpass.Q.value = resonanceToQ(params.resonance, 0.5, 5);
  lowpass.connect(preColor);

  const body = ctx.createOscillator();
  body.type = 'sine';
  const bodyGain = ctx.createGain();
  body.connect(bodyGain);
  bodyGain.connect(lowpass);
  applyPitchGlide(body, t0, basePitchHz * glideAmount, basePitchHz, glideSec);
  applyPunchDecay(bodyGain, t0, 1, attackSec, punchDecaySec, sustainFrac, tailDecaySec);
  body.start(t0);
  body.stop(t0 + punchDecaySec + tailDecaySec + 0.25);

  // Beater/click transient — kicks lean on this a lot more than 808s do.
  // A low-passed thump, not a bandpassed "tick": a reference kit measured
  // real kick transients concentrated around 60-290Hz, not the kHz range.
  // Bypasses the resonant lowpass: a noise impulse through a high-Q filter
  // rings at the cutoff frequency instead of just thumping.
  const noiseBuf = makeNoiseBuffer(ctx, 0.03, rng);
  const click = noiseSource(ctx, noiseBuf);
  const clickFilter = ctx.createBiquadFilter();
  clickFilter.type = 'bandpass';
  clickFilter.frequency.value = lerp(700, 3800, params.tone) * randRange(rng, 0.95, 1.05);
  clickFilter.Q.value = 0.9;
  const clickGain = ctx.createGain();
  click.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(preColor);
  applyAD(clickGain, t0, 0.08 + 0.24 * params.punch, attackSec, 0.012, 'exp');
  click.start(t0);
  click.stop(t0 + 0.04);
}

export function makeKickRecipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  const durationSec = kickTailDecaySec(params.decay, 0.65) + 0.2;
  return { id: `kick-${seed}`, instrument: 'kick', seed, params, basePitchHz, durationSec };
}
