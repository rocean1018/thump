export type Instrument = '808' | 'kick' | 'hihat' | 'snare';

export const INSTRUMENTS: { id: Instrument; label: string; blurb: string }[] = [
  { id: '808', label: '808', blurb: 'Sub-heavy pitched bass drum with a glide and a tail.' },
  { id: 'kick', label: 'Kick', blurb: 'Punchy, short-tailed low-end drum.' },
  { id: 'hihat', label: 'Hi-Hat', blurb: 'Metallic, filtered noise — closed or open.' },
  { id: 'snare', label: 'Snare', blurb: 'Tonal body plus noise snap.' },
];

/**
 * "Creative" controls exposed to the user, always normalized 0..1 unless noted.
 * These map into instrument-specific synthesis parameters (see paramMapping.ts).
 * Keeping this layer separate from the synthesis engine is what lets refinement
 * stay non-destructive: the underlying "recipe" (seed-derived character) never
 * changes when these move, only their mapped outputs do.
 */
export interface CreativeParams {
  attack: number; // 0 = softest onset, 1 = instant/hardest transient
  decay: number; // 0 = short/tight, 1 = long tail
  punch: number; // 0 = none, 1 = maximum transient thump/click
  tone: number; // 0 = dark/dull, 1 = bright/airy (also nudges pitch for 808/kick)
  distortion: number; // 0 = clean, 1 = heavily saturated/clipped
}

export const DEFAULT_CREATIVE_PARAMS: CreativeParams = {
  attack: 0.5,
  decay: 0.5,
  punch: 0.5,
  tone: 0.5,
  distortion: 0.15,
};

/**
 * A "recipe" is the full, reproducible description of one sound: a seed for the
 * parts of the synthesis that should stay fixed across parameter refinement
 * (e.g. which inharmonic ratios a hi-hat uses, the exact noise buffer), plus the
 * creative params that are safe to tweak live.
 */
export interface SoundRecipe {
  id: string;
  instrument: Instrument;
  seed: number;
  params: CreativeParams;
  /** Base pitch in Hz for pitched instruments (808/kick/snare body). */
  basePitchHz: number;
  /** Length of the rendered buffer in seconds (includes tail). */
  durationSec: number;
}

export interface Variation {
  recipe: SoundRecipe;
  buffer: AudioBuffer;
}

export type GenerationStage =
  | 'idle'
  | 'analyzing-reference'
  | 'parsing-prompt'
  | 'synthesizing'
  | 'ready'
  | 'error';

export interface ReferenceAnalysis {
  fileName: string;
  durationSec: number;
  fundamentalHz: number | null;
  spectralCentroidHz: number;
  attackSec: number;
  decaySec: number;
  peakLevel: number;
}

export interface PromptInterpretation {
  /** Deltas in -1..1 applied on top of CreativeParams defaults. */
  deltas: Partial<CreativeParams>;
  pitchBiasSemitones: number;
  matchedTokens: string[];
}
