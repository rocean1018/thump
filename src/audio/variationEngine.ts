import type { CreativeParams, Instrument, PromptInterpretation, ReferenceAnalysis, SoundRecipe } from '../types';
import { DEFAULT_CREATIVE_PARAMS } from '../types';
import { mulberry32, newSeed, randRange } from './rng';
import { clamp } from './synthesis/common';
import { make808Recipe } from './synthesis/808';
import { makeKickRecipe } from './synthesis/kick';
import { makeHihatRecipe } from './synthesis/hihat';
import { makeSnareRecipe } from './synthesis/snare';

const BASE_PITCH_RANGE: Record<Instrument, [number, number]> = {
  '808': [38, 60],
  kick: [50, 92],
  hihat: [210, 380],
  snare: [175, 235],
};

// Reference decay/attack ranges used to map measured seconds into the 0..1 creative
// scale. decayExponent inverts each engine's decay easing curve (see hihat.ts /
// snare.ts) so a reference's measured decay lands on the param value that actually
// reproduces that length, not the pre-curve linear guess.
const REF_SCALE: Record<Instrument, { attackMax: number; decayMax: number; decayExponent: number }> = {
  '808': { attackMax: 0.04, decayMax: 3, decayExponent: 1 },
  kick: { attackMax: 0.02, decayMax: 0.6, decayExponent: 1 },
  hihat: { attackMax: 0.01, decayMax: 0.55, decayExponent: 3 },
  snare: { attackMax: 0.015, decayMax: 0.42, decayExponent: 2 },
};

const RECIPE_FACTORY = {
  '808': make808Recipe,
  kick: makeKickRecipe,
  hihat: makeHihatRecipe,
  snare: makeSnareRecipe,
} as const;

function applyDelta(base: number, delta: number | undefined): number {
  return clamp(base + (delta ?? 0), 0, 1);
}

const PARAM_KEYS: (keyof CreativeParams)[] = ['attack', 'decay', 'punch', 'tone', 'distortion', 'grit', 'resonance'];

interface CenterResult {
  params: CreativeParams;
  basePitchHz: number;
}

/** Blends defaults + prompt interpretation + optional reference analysis into one center recipe. */
export function computeCenter(
  instrument: Instrument,
  prompt: PromptInterpretation | null,
  reference: ReferenceAnalysis | null
): CenterResult {
  let params: CreativeParams = { ...DEFAULT_CREATIVE_PARAMS };
  const [pitchMin, pitchMax] = BASE_PITCH_RANGE[instrument];
  let basePitchHz = pitchMin + (pitchMax - pitchMin) * 0.5;

  if (prompt) {
    const next = { ...params };
    for (const key of PARAM_KEYS) next[key] = applyDelta(params[key], prompt.deltas[key]);
    params = next;
    basePitchHz *= Math.pow(2, prompt.pitchBiasSemitones / 12);
  }

  if (reference) {
    const scale = REF_SCALE[instrument];
    const blend = 0.45; // reference nudges the center; doesn't fully override intent

    const refAttack = clamp(1 - reference.attackSec / scale.attackMax, 0, 1);
    const refDecayLinear = clamp(reference.decaySec / scale.decayMax, 0, 1);
    const refDecay = Math.pow(refDecayLinear, 1 / scale.decayExponent);
    // Map spectral centroid ~500Hz..9000Hz to 0..1 brightness.
    const refTone = clamp((reference.spectralCentroidHz - 500) / (9000 - 500), 0, 1);

    params = {
      ...params,
      attack: params.attack * (1 - blend) + refAttack * blend,
      decay: params.decay * (1 - blend) + refDecay * blend,
      tone: params.tone * (1 - blend) + refTone * blend,
    };

    if (reference.fundamentalHz && reference.fundamentalHz >= pitchMin * 0.5 && reference.fundamentalHz <= pitchMax * 2.2) {
      const refPitch = clamp(reference.fundamentalHz, pitchMin * 0.6, pitchMax * 1.6);
      basePitchHz = basePitchHz * (1 - blend) + refPitch * blend;
    }
  }

  const clamped = { ...params };
  for (const key of PARAM_KEYS) clamped[key] = clamp(params[key], 0, 1);

  return { params: clamped, basePitchHz };
}

// Each of the 3 slots is deliberately pulled toward a different corner of the
// sound space — tighter/darker, centered, or looser/brighter — so the three
// results read as genuinely different takes, not noise around one point.
// Random jitter is layered on top per-slot so repeated regenerations don't just
// reproduce the same three archetypes.
const SLOT_BIAS: (Record<keyof CreativeParams, number> & { pitchSemi: number })[] = [
  { attack: -0.16, decay: -0.22, punch: 0.14, tone: -0.16, distortion: -0.05, grit: 0.1, resonance: 0.05, pitchSemi: -2.2 },
  { attack: 0, decay: 0, punch: 0, tone: 0, distortion: 0, grit: 0, resonance: 0, pitchSemi: 0 },
  { attack: 0.14, decay: 0.26, punch: -0.1, tone: 0.18, distortion: 0.1, grit: -0.08, resonance: 0.15, pitchSemi: 2.6 },
];

const JITTER = 0.14;
const PITCH_JITTER_SEMITONES = 1.8;

/** Produces 3 distinct-but-related recipes around a center point, seeded for reproducibility. */
export function generateVariations(
  instrument: Instrument,
  prompt: PromptInterpretation | null,
  reference: ReferenceAnalysis | null,
  regenSeed: number = newSeed()
): SoundRecipe[] {
  const center = computeCenter(instrument, prompt, reference);
  const factory = RECIPE_FACTORY[instrument];
  const rng = mulberry32(regenSeed);

  // Scales how far the biased slots spread apart this generation, so back-to-back
  // regenerations don't all feel identically "wide."
  const spreadScale = randRange(rng, 0.75, 1.35);
  const pitchSpreadScale = randRange(rng, 0.7, 1.5);

  return [0, 1, 2].map((i) => {
    const variationSeed = Math.floor(rng() * 2 ** 31) ^ (regenSeed + i * 7919);
    const vRng = mulberry32(variationSeed);
    const bias = SLOT_BIAS[i];

    const jitter = (key: keyof CreativeParams, biasValue: number) =>
      clamp(center.params[key] + biasValue * spreadScale + randRange(vRng, -JITTER, JITTER), 0, 1);

    const params: CreativeParams = {
      attack: jitter('attack', bias.attack),
      decay: jitter('decay', bias.decay),
      punch: jitter('punch', bias.punch),
      tone: jitter('tone', bias.tone),
      distortion: jitter('distortion', bias.distortion * 0.7),
      grit: jitter('grit', bias.grit),
      resonance: jitter('resonance', bias.resonance),
    };

    const pitchSemitones = bias.pitchSemi * pitchSpreadScale + randRange(vRng, -PITCH_JITTER_SEMITONES, PITCH_JITTER_SEMITONES);
    const basePitchHz = center.basePitchHz * Math.pow(2, pitchSemitones / 12);

    return factory(variationSeed, basePitchHz, params);
  });
}

/** Non-destructive refinement: same seed/instrument/basePitch, only creative params change. */
export function refineRecipe(recipe: SoundRecipe, params: CreativeParams): SoundRecipe {
  const factory = RECIPE_FACTORY[recipe.instrument];
  return factory(recipe.seed, recipe.basePitchHz, params);
}
