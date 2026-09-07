import type { CreativeParams, Instrument, PromptInterpretation, ReferenceAnalysis, SoundRecipe } from '../types';
import { mulberry32, newSeed, randRange } from './rng';
import { clamp } from './synthesis/common';
import { make808Recipe } from './synthesis/808';
import { makeKickRecipe } from './synthesis/kick';
import { makeHihatRecipe } from './synthesis/hihat';
import { makeSnareRecipe } from './synthesis/snare';
import { chooseCharacter, characterParams, decayParam, type Character } from './characters';

// Measuring a reference kit showed real 808s and kicks actually sit in a
// similar low register (808s ~29-43Hz, kicks ~38-50Hz) — pitch alone isn't
// what separates them in real production. Their differentiation comes mostly
// from duration and decay shape (see 808.ts / kick.ts): kicks are short with
// a fast punch-then-thud, 808s ring out much longer. Kick's range still sits
// a bit higher on average so it isn't a pure duplicate of the 808 range.
const BASE_PITCH_RANGE: Record<Instrument, [number, number]> = {
  '808': [30, 48],
  kick: [40, 82],
  hihat: [210, 380],
  snare: [175, 235],
};

// Match each voice's maximum attack time; decay uses the shared logarithmic map.
const REF_SCALE: Record<Instrument, { attackMax: number }> = {
  '808': { attackMax: 0.035 },
  kick: { attackMax: 0.025 },
  hihat: { attackMax: 0.014 },
  snare: { attackMax: 0.018 },
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
  character: Character;
  params: CreativeParams;
  basePitchHz: number;
}

/** Blends defaults + prompt interpretation + optional reference analysis into one center recipe. */
export function computeCenter(
  instrument: Instrument,
  prompt: PromptInterpretation | null,
  reference: ReferenceAnalysis | null
): CenterResult {
  const { character } = chooseCharacter(instrument, prompt?.source);
  let params: CreativeParams = characterParams(character);
  const [pitchMin, pitchMax] = BASE_PITCH_RANGE[instrument];
  let basePitchHz = character.pitchHz;

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
    // Approximate the dominant envelope's -20dB crossing. The weighted v3 voices
    // no longer decay as one exponential, so the old universal x3 over-lengthened them.
    const weight = character.weight ?? (instrument === '808' ? .58 : instrument === 'kick' ? .32 : instrument === 'hihat' ? (character.id === 'hat-open' ? .3 : .22) : character.clap ? .28 : .2);
    const crossing = character.id === '808-sub' ? .18 + 1 / 3
      : .48 + .52 * Math.log(.1 / weight) / Math.log(.001 / weight);
    const refDecay = decayParam(instrument, reference.decaySec / crossing);
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
  if (prompt?.decaySeconds !== undefined) clamped.decay = decayParam(instrument, prompt.decaySeconds);
  if (prompt?.absolutePitchHz && instrument !== 'hihat') basePitchHz = clamp(prompt.absolutePitchHz, 25, 1000);
  for (const key of PARAM_KEYS) clamped[key] = clamp(clamped[key], 0, 1);

  return { params: clamped, basePitchHz, character };
}

// Each of the 3 slots is deliberately pulled toward a different corner of the
// sound space — tighter/darker, centered, or looser/brighter — so the three
// results read as genuinely different takes, not noise around one point.
// Random jitter is layered on top per-slot so repeated regenerations don't just
// reproduce the same three archetypes.
const SLOT_BIAS: (Record<keyof CreativeParams, number> & { pitchSemi: number })[] = [
  { pitch: 0, attack: 0, decay: 0, punch: 0, tone: 0, distortion: 0, grit: 0, resonance: 0, pitchSemi: 0 },
  { pitch: 0, attack: .08, decay: -.12, punch: .1, tone: .04, distortion: 0, grit: 0, resonance: -.05, pitchSemi: 0 },
  { pitch: 0, attack: -.04, decay: .12, punch: -.06, tone: -.08, distortion: .04, grit: 0, resonance: .05, pitchSemi: 0 },
];

const JITTER = 0.045;

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
  // Reserve the old pitch RNG draw to retain seeded variation identities.
  rng();

  return [0, 1, 2].map((i) => {
    const variationSeed = Math.floor(rng() * 2 ** 31) ^ (regenSeed + i * 7919);
    const vRng = mulberry32(variationSeed);
    const bias = SLOT_BIAS[i];

    const jitter = (key: keyof CreativeParams, biasValue: number) => {
      if (i === 0) return center.params[key];
      // Explicit prompt attributes constrain the exploration; clean stays clean.
      if ((key === 'distortion' || key === 'grit') && center.params[key] === 0) return 0;
      const strength = prompt?.deltas[key] !== undefined ? .25 : 1;
      return clamp(center.params[key] + (biasValue * spreadScale + randRange(vRng, -JITTER, JITTER)) * strength, 0, 1);
    };

    const params: CreativeParams = {
      pitch: .5,
      attack: jitter('attack', bias.attack),
      decay: jitter('decay', bias.decay),
      punch: jitter('punch', bias.punch),
      tone: jitter('tone', bias.tone),
      distortion: jitter('distortion', bias.distortion * 0.7),
      grit: jitter('grit', bias.grit),
      resonance: jitter('resonance', bias.resonance),
    };

    // Stable tuning across the audition set; shape is what varies.
    const basePitchHz = center.basePitchHz;

    return { ...factory(variationSeed, basePitchHz, params), character: center.character.id };
  });
}

/** Non-destructive refinement: same seed/instrument/basePitch, only creative params change. */
export function refineRecipe(recipe: SoundRecipe, params: CreativeParams): SoundRecipe {
  const factory = RECIPE_FACTORY[recipe.instrument];
  return { ...factory(recipe.seed, recipe.basePitchHz, params), character: recipe.character };
}
