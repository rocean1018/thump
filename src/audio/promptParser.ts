import type { CreativeParams, PromptInterpretation } from '../types';

/**
 * Rule-based prompt interpretation. No network call, no LLM — a hand-tuned
 * keyword lexicon mapped to deltas on the five creative params plus a pitch
 * bias in semitones. Deliberately simple and inspectable: this is the product's
 * "prompt reliability" story (see PRD risks) — predictable beats clever.
 */
type Lexicon = Record<string, { deltas: Partial<CreativeParams>; pitch?: number }>;

const LEXICON: Lexicon = {
  // Tone / brightness
  dark: { deltas: { tone: -0.35 }, pitch: -1 },
  moody: { deltas: { tone: -0.25 } },
  murky: { deltas: { tone: -0.4 } },
  dull: { deltas: { tone: -0.3 } },
  bright: { deltas: { tone: 0.35 }, pitch: 0.5 },
  airy: { deltas: { tone: 0.4, decay: 0.1 } },
  crisp: { deltas: { tone: 0.3, attack: 0.2 } },
  metallic: { deltas: { tone: 0.45 } },
  glassy: { deltas: { tone: 0.4 } },
  warm: { deltas: { tone: -0.2, distortion: 0.1 } },

  // Punch / transient
  punchy: { deltas: { punch: 0.4, attack: 0.2 } },
  hard: { deltas: { punch: 0.35, distortion: 0.15 } },
  aggressive: { deltas: { punch: 0.4, distortion: 0.3 } },
  soft: { deltas: { punch: -0.35, attack: -0.2 } },
  gentle: { deltas: { punch: -0.3, attack: -0.2 } },
  smooth: { deltas: { punch: -0.2, distortion: -0.2 } },
  snappy: { deltas: { punch: 0.3, attack: 0.3, decay: -0.15 } },
  slappy: { deltas: { punch: 0.35, attack: 0.25 } },

  // Decay / length
  long: { deltas: { decay: 0.4 } },
  'long-tailed': { deltas: { decay: 0.45 } },
  sustained: { deltas: { decay: 0.35 } },
  short: { deltas: { decay: -0.35 } },
  tight: { deltas: { decay: -0.3, attack: 0.15 } },
  clipped: { deltas: { decay: -0.25, distortion: 0.3 } },
  quick: { deltas: { decay: -0.25 } },
  boomy: { deltas: { decay: 0.3, tone: -0.15 } },

  // Distortion / grit
  distorted: { deltas: { distortion: 0.5 } },
  dirty: { deltas: { distortion: 0.45 } },
  gritty: { deltas: { distortion: 0.4 } },
  fuzzy: { deltas: { distortion: 0.4, tone: -0.1 } },
  clean: { deltas: { distortion: -0.3 } },
  pristine: { deltas: { distortion: -0.35, tone: 0.1 } },
  crunchy: { deltas: { distortion: 0.35 } },
  saturated: { deltas: { distortion: 0.4 } },

  // Pitch
  deep: { deltas: {}, pitch: -3 },
  sub: { deltas: {}, pitch: -3.5 },
  low: { deltas: {}, pitch: -2 },
  heavy: { deltas: { distortion: 0.15 }, pitch: -2 },
  high: { deltas: {}, pitch: 2.5 },
  thin: { deltas: { tone: 0.15 }, pitch: 1.5 },
  fat: { deltas: { tone: -0.1, distortion: 0.1 }, pitch: -1 },
  thick: { deltas: { tone: -0.1, distortion: 0.15 }, pitch: -1 },

  // Character words that don't map cleanly to one axis get a small multi-axis nudge
  trap: { deltas: { punch: 0.15, distortion: 0.1 } },
  underground: { deltas: { distortion: 0.2, tone: -0.15 } },
  lofi: { deltas: { distortion: 0.25, tone: -0.2 } },
  vintage: { deltas: { distortion: 0.15, tone: -0.15 } },
  modern: { deltas: { tone: 0.15, punch: 0.1 } },
  808: { deltas: {}, pitch: -1 },
};

const NEGATIONS = new Set(['not', "isn't", 'no', "don't", 'without']);

export function interpretPrompt(prompt: string): PromptInterpretation {
  const tokens = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const deltas: Partial<CreativeParams> = {};
  let pitchBiasSemitones = 0;
  const matchedTokens: string[] = [];

  tokens.forEach((token, i) => {
    const entry = LEXICON[token];
    if (!entry) return;
    const prev = tokens[i - 1];
    const negate = prev && NEGATIONS.has(prev) ? -1 : 1;

    matchedTokens.push(token);
    for (const [key, value] of Object.entries(entry.deltas)) {
      const k = key as keyof CreativeParams;
      deltas[k] = (deltas[k] ?? 0) + value! * negate;
    }
    if (entry.pitch) {
      pitchBiasSemitones += entry.pitch * negate;
    }
  });

  // Clamp accumulated deltas to a sane range so stacking synonyms doesn't blow past bounds.
  for (const key of Object.keys(deltas) as (keyof CreativeParams)[]) {
    deltas[key] = Math.max(-0.7, Math.min(0.7, deltas[key]!));
  }
  pitchBiasSemitones = Math.max(-6, Math.min(6, pitchBiasSemitones));

  return { deltas, pitchBiasSemitones, matchedTokens };
}
