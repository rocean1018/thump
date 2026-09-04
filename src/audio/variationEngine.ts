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

// Reference decay/attack ranges used to map measured seconds into the 0..1 creative scale.
const REF_SCALE: Record<Instrument, { attackMax: number; decayMax: number }> = {
  '808': { attackMax: 0.04, decayMax: 3 },
  kick: { attackMax: 0.02, decayMax: 0.6 },
  hihat: { attackMax: 0.01, decayMax: 0.7 },
  snare: { attackMax: 0.015, decayMax: 0.5 },
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
    params = {
      attack: applyDelta(params.attack, prompt.deltas.attack),
      decay: applyDelta(params.decay, prompt.deltas.decay),
      punch: applyDelta(params.punch, prompt.deltas.punch),
      tone: applyDelta(params.tone, prompt.deltas.tone),
      distortion: applyDelta(params.distortion, prompt.deltas.distortion),
    };
    basePitchHz *= Math.pow(2, prompt.pitchBiasSemitones / 12);
  }

  if (reference) {
    const scale = REF_SCALE[instrument];
    const blend = 0.45; // reference nudges the center; doesn't fully override intent

    const refAttack = clamp(1 - reference.attackSec / scale.attackMax, 0, 1);
    const refDecay = clamp(reference.decaySec / scale.decayMax, 0, 1);
    // Map spectral centroid ~500Hz..9000Hz to 0..1 brightness.
    const refTone = clamp((reference.spectralCentroidHz - 500) / (9000 - 500), 0, 1);

    params = {
      attack: params.attack * (1 - blend) + refAttack * blend,
      decay: params.decay * (1 - blend) + refDecay * blend,
      punch: params.punch,
      tone: params.tone * (1 - blend) + refTone * blend,
      distortion: params.distortion,
    };

    if (reference.fundamentalHz && reference.fundamentalHz >= pitchMin * 0.5 && reference.fundamentalHz <= pitchMax * 2.2) {
      const refPitch = clamp(reference.fundamentalHz, pitchMin * 0.6, pitchMax * 1.6);
      basePitchHz = basePitchHz * (1 - blend) + refPitch * blend;
    }
  }

  params = {
    attack: clamp(params.attack, 0, 1),
    decay: clamp(params.decay, 0, 1),
    punch: clamp(params.punch, 0, 1),
    tone: clamp(params.tone, 0, 1),
    distortion: clamp(params.distortion, 0, 1),
  };

  return { params, basePitchHz };
}

const VARIATION_JITTER = 0.16;

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

  return [0, 1, 2].map((i) => {
    const variationSeed = Math.floor(rng() * 2 ** 31) ^ (regenSeed + i * 7919);
    const vRng = mulberry32(variationSeed);
    const jitter = (key: keyof CreativeParams) =>
      clamp(center.params[key] + randRange(vRng, -VARIATION_JITTER, VARIATION_JITTER), 0, 1);

    const params: CreativeParams = {
      attack: jitter('attack'),
      decay: jitter('decay'),
      punch: jitter('punch'),
      tone: jitter('tone'),
      distortion: clamp(center.params.distortion + randRange(vRng, -VARIATION_JITTER * 0.6, VARIATION_JITTER * 0.6), 0, 1),
    };
    const pitchJitter = randRange(vRng, -0.6, 0.6); // semitone-ish jitter for variety
    const basePitchHz = center.basePitchHz * Math.pow(2, pitchJitter / 12);

    return factory(variationSeed, basePitchHz, params);
  });
}

/** Non-destructive refinement: same seed/instrument/basePitch, only creative params change. */
export function refineRecipe(recipe: SoundRecipe, params: CreativeParams): SoundRecipe {
  const factory = RECIPE_FACTORY[recipe.instrument];
  return factory(recipe.seed, recipe.basePitchHz, params);
}
