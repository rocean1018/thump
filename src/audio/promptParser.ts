import type { CreativeParams, PromptInterpretation } from '../types';

/**
 * Rule-based prompt interpretation. No network call, no LLM — a large,
 * hand-tuned lexicon (single words, phrases, and named style archetypes)
 * mapped to deltas across all seven creative params plus a pitch bias.
 * Deliberately inspectable rather than a black box.
 *
 * Matching is a single left-to-right pass over the token stream that tries
 * 3-word, then 2-word, then 1-word matches at each position (so "long tail"
 * and "boom bap" work the same as single words like "dark"), while tracking
 * an intensity modifier ("very", "slightly") and a negation ("not") that
 * apply to whatever is matched next.
 */
type Delta = Partial<CreativeParams>;
interface LexEntry {
  deltas: Delta;
  pitch?: number;
}

const LEXICON: Record<string, LexEntry> = {
  'no punch': { deltas: { punch: -.85 } },
  punch: { deltas: { punch: .4 } },
  'hard attack': { deltas: { attack: .5 } },
  'slow attack': { deltas: { attack: -.5 } },
  'fast attack': { deltas: { attack: .5 } },
  'short decay': { deltas: { decay: -.4 } },
  'long decay': { deltas: { decay: .4 } },
  'no grit': { deltas: { grit: -.85 } },
  grit: { deltas: { grit: .4 } },
  clicky: { deltas: { tone: .25, punch: .3, attack: .3 } },
  sizzle: { deltas: { tone: .2, decay: .2 } },
  'no distortion': { deltas: { distortion: -.85, grit: -.85 } },
  'without distortion': { deltas: { distortion: -.85, grit: -.85 } },
  distortion: { deltas: { distortion: .5 } },
  saturation: { deltas: { distortion: .4 } },
  open: { deltas: { decay: .4 } },
  closed: { deltas: { decay: -.3 } },
  'soft attack': { deltas: { attack: -.4 } },
  'sharp attack': { deltas: { attack: .4 } },
  // ---- brightness / tone -------------------------------------------------
  dark: { deltas: { tone: -0.32 }, pitch: -1 },
  moody: { deltas: { tone: -0.22, resonance: 0.1 } },
  murky: { deltas: { tone: -0.4, resonance: -0.15 } },
  dull: { deltas: { tone: -0.3 } },
  muted: { deltas: { tone: -0.28, decay: -0.1 } },
  dim: { deltas: { tone: -0.25 } },
  gloomy: { deltas: { tone: -0.3, decay: 0.1 } },
  sinister: { deltas: { tone: -0.25, resonance: 0.2 }, pitch: -1.5 },
  eerie: { deltas: { tone: -0.2, resonance: 0.25, decay: 0.15 }, pitch: -1 },
  bright: { deltas: { tone: 0.35 }, pitch: 0.5 },
  airy: { deltas: { tone: 0.4, decay: 0.1, resonance: -0.1 } },
  crisp: { deltas: { tone: 0.3, attack: 0.2 } },
  glassy: { deltas: { tone: 0.4, resonance: 0.15 } },
  shiny: { deltas: { tone: 0.35 } },
  sparkly: { deltas: { tone: 0.4, resonance: 0.1 } },
  metallic: { deltas: { tone: 0.45, resonance: 0.25 } },
  warm: { deltas: { tone: -0.2, distortion: 0.1, grit: 0.06 } },
  cold: { deltas: { tone: 0.15, resonance: -0.1 }, pitch: 0.5 },
  icy: { deltas: { tone: 0.3, resonance: 0.1 }, pitch: 1 },
  nasally: { deltas: { tone: 0.1, resonance: 0.4 } },
  boxy: { deltas: { tone: -0.1, resonance: 0.35 } },
  hollow: { deltas: { tone: -0.1, resonance: 0.3, decay: 0.1 } },
  honky: { deltas: { resonance: 0.4, tone: 0.05 } },

  // ---- punch / transient --------------------------------------------------
  punchy: { deltas: { punch: 0.4, attack: 0.2 } },
  hard: { deltas: { punch: 0.35, distortion: 0.15 } },
  aggressive: { deltas: { punch: 0.4, distortion: 0.3, attack: 0.15 } },
  violent: { deltas: { punch: 0.45, distortion: 0.35, attack: 0.2 } },
  soft: { deltas: { punch: -0.35, attack: -0.2 } },
  gentle: { deltas: { punch: -0.3, attack: -0.2 } },
  smooth: { deltas: { punch: -0.2, distortion: -0.2, resonance: -0.15 } },
  snappy: { deltas: { punch: 0.3, attack: 0.3, decay: -0.15 } },
  slappy: { deltas: { punch: 0.35, attack: 0.25 } },
  weak: { deltas: { punch: -0.3 } },
  powerful: { deltas: { punch: 0.35 } },
  forceful: { deltas: { punch: 0.35, attack: 0.15 } },
  subtle: { deltas: { punch: -0.25, distortion: -0.1 } },

  // ---- decay / length -------------------------------------------------
  long: { deltas: { decay: 0.4 } },
  'long-tailed': { deltas: { decay: 0.45 } },
  'long tail': { deltas: { decay: 0.45 } },
  sustained: { deltas: { decay: 0.35 } },
  ringing: { deltas: { decay: 0.3, resonance: 0.3 } },
  'ring out': { deltas: { decay: 0.4, resonance: 0.25 } },
  short: { deltas: { decay: -0.35 } },
  tight: { deltas: { decay: -0.3, attack: 0.15 } },
  'short and tight': { deltas: { decay: -0.4, attack: 0.2 } },
  quick: { deltas: { decay: -0.25 } },
  boomy: { deltas: { decay: 0.3, tone: -0.15, resonance: 0.15 } },
  dead: { deltas: { decay: -0.3, resonance: -0.25 } },
  choked: { deltas: { decay: -0.35, attack: 0.1 } },
  staccato: { deltas: { decay: -0.3, attack: 0.15 } },
  'no tail': { deltas: { decay: -0.5 } },

  // ---- distortion / grit -----------------------------------------------
  clipped: { deltas: { distortion: 0.3 } },
  distorted: { deltas: { distortion: 0.5 } },
  dirty: { deltas: { distortion: 0.35, grit: 0.25 } },
  gritty: { deltas: { grit: 0.4, distortion: 0.15 } },
  fuzzy: { deltas: { distortion: 0.4, tone: -0.1 } },
  clean: { deltas: { distortion: -0.3, grit: -0.15 } },
  pristine: { deltas: { distortion: -0.35, grit: -0.2, tone: 0.1 } },
  crunchy: { deltas: { distortion: 0.35, grit: 0.15 } },
  saturated: { deltas: { distortion: 0.4 } },
  crushed: { deltas: { grit: 0.5 } },
  bitcrushed: { deltas: { grit: 0.55 } },
  dusty: { deltas: { grit: 0.35, tone: -0.15, distortion: 0.1 } },
  vinyl: { deltas: { grit: 0.3, tone: -0.2, distortion: 0.05 } },
  lofi: { deltas: { grit: 0.35, tone: -0.2, distortion: 0.15 } },
  'lo-fi': { deltas: { grit: 0.35, tone: -0.2, distortion: 0.15 } },
  tape: { deltas: { grit: 0.2, distortion: 0.15, tone: -0.1 } },
  analog: { deltas: { grit: 0.15, distortion: 0.1, tone: -0.05 } },
  digital: { deltas: { grit: -0.1, tone: 0.1 } },
  harsh: { deltas: { distortion: 0.35, resonance: 0.2, tone: 0.15 } },
  raw: { deltas: { grit: 0.25, distortion: 0.15 } },
  grimy: { deltas: { grit: 0.35, distortion: 0.2, tone: -0.15 } },
  nasty: { deltas: { grit: 0.3, distortion: 0.3 } },
  filthy: { deltas: { grit: 0.4, distortion: 0.35 } },

  // ---- resonance / character -----------------------------------------
  resonant: { deltas: { resonance: 0.45 } },
  ringy: { deltas: { resonance: 0.4, decay: 0.15 } },
  flat: { deltas: { resonance: -0.35 } },
  twangy: { deltas: { resonance: 0.35 } },

  // ---- pitch --------------------------------------------------------
  deep: { deltas: {}, pitch: -3 },
  sub: { deltas: {}, pitch: -3.5 },
  'sub heavy': { deltas: { tone: -0.15 }, pitch: -3 },
  'sub-heavy': { deltas: { tone: -0.15 }, pitch: -3 },
  'mid heavy': { deltas: { tone: 0.15 }, pitch: 1.5 },
  low: { deltas: {}, pitch: -2 },
  heavy: { deltas: { distortion: 0.15 }, pitch: -2 },
  high: { deltas: {}, pitch: 2.5 },
  tiny: { deltas: { tone: 0.15 }, pitch: 3 },
  massive: { deltas: { distortion: 0.1 }, pitch: -2.5 },
  huge: { deltas: { distortion: 0.1 }, pitch: -2 },
  thin: { deltas: { tone: 0.15 }, pitch: 1.5 },
  fat: { deltas: { tone: -0.1, distortion: 0.1 }, pitch: -1 },
  thick: { deltas: { tone: -0.1, distortion: 0.15 }, pitch: -1 },

  // ---- named styles / regional archetypes (bigger, multi-axis pulls) ----
  trap: { deltas: { punch: 0.15, distortion: 0.1 } },
  underground: { deltas: { distortion: 0.2, grit: 0.2, tone: -0.15 } },
  memphis: { deltas: { grit: 0.4, tone: -0.3, distortion: 0.15, decay: 0.15 }, pitch: -2 },
  phonk: { deltas: { grit: 0.45, tone: -0.3, distortion: 0.2, resonance: 0.15 }, pitch: -1.5 },
  drill: { deltas: { punch: 0.3, attack: 0.25, tone: -0.15 }, pitch: -2.5 },
  'uk drill': { deltas: { punch: 0.3, attack: 0.25, tone: -0.2, resonance: 0.15 }, pitch: -3 },
  'ny drill': { deltas: { punch: 0.35, attack: 0.3, distortion: 0.15 }, pitch: -2 },
  'boom bap': { deltas: { decay: 0.25, tone: -0.15, distortion: 0.2, punch: 0.2 } },
  atlanta: { deltas: { punch: 0.2, tone: 0.05 } },
  opium: { deltas: { distortion: 0.3, grit: 0.25, tone: 0.1 } },
  rage: { deltas: { punch: 0.4, distortion: 0.4, attack: 0.25 } },
  vintage: { deltas: { distortion: 0.15, grit: 0.25, tone: -0.15 } },
  'old school': { deltas: { grit: 0.25, distortion: 0.15, tone: -0.2, decay: 0.1 } },
  'new school': { deltas: { tone: 0.2, punch: 0.15, grit: -0.1 } },
  'west coast': { deltas: { tone: 0.1, resonance: 0.1 }, pitch: -1 },
  'dirty south': { deltas: { distortion: 0.2, grit: 0.15, tone: -0.1 } },
  'cloud rap': { deltas: { tone: 0.15, decay: 0.2, distortion: -0.1 } },

  // ---- misc genre-adjacent words -----------------------------------
  808: { deltas: {} },
  modern: { deltas: { tone: 0.15, punch: 0.1, grit: -0.05 } },
};

// Intensity modifiers scale whatever is matched next; negations flip its sign.
const MODIFIERS: Record<string, number> = {
  very: 1.55,
  super: 1.7,
  extremely: 1.85,
  really: 1.45,
  incredibly: 1.8,
  slightly: 0.45,
  somewhat: 0.55,
  kinda: 0.6,
  'kind of': 0.6,
  'a bit': 0.5,
  'a little': 0.45,
  too: 1.3,
  more: 1.35,
  less: -0.5,
  barely: 0.35,
};

const NEGATIONS = new Set(['not', "isn't", 'no', "don't", 'without', 'never']);

const DELTA_KEYS: (keyof CreativeParams)[] = ['attack', 'decay', 'punch', 'tone', 'distortion', 'grit', 'resonance'];

function tokenize(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function interpretPrompt(prompt: string): PromptInterpretation {
  const words = tokenize(prompt);
  const deltas: Delta = {};
  const positive: Delta = {}, negative: Delta = {};
  let pitchBiasSemitones = 0;
  const matchedTokens: string[] = [];

  let pendingMultiplier = 1;
  let pendingNegate = 1;
  let i = 0;

  while (i < words.length) {
    const word = words[i];

    const twoGram = i + 1 < words.length ? `${word} ${words[i + 1]}` : null;
    if (twoGram && MODIFIERS[twoGram] !== undefined) {
      pendingMultiplier *= MODIFIERS[twoGram];
      i += 2;
      continue;
    }
    if (MODIFIERS[word] !== undefined) {
      pendingMultiplier *= MODIFIERS[word];
      i++;
      continue;
    }
    if (NEGATIONS.has(word) && !(twoGram && LEXICON[twoGram])) {
      pendingNegate = -1;
      i++;
      continue;
    }

    let matched: LexEntry | null = null;
    let matchLen = 1;
    for (const n of [3, 2, 1]) {
      if (i + n > words.length) continue;
      const phrase = words.slice(i, i + n).join(' ');
      if (LEXICON[phrase]) {
        matched = LEXICON[phrase];
        matchLen = n;
        break;
      }
    }

    if (matched) {
      matchedTokens.push(words.slice(i, i + matchLen).join(' '));
      const factor = pendingMultiplier * pendingNegate;
      for (const [key, value] of Object.entries(matched.deltas)) {
        const k = key as keyof CreativeParams;
        // Synonyms reinforce intent without collapsing a preset to a slider extreme.
        const delta = value! * factor;
        positive[k] = Math.max(positive[k] ?? 0, delta);
        negative[k] = Math.min(negative[k] ?? 0, delta);
        deltas[k] = positive[k]! + negative[k]!;
      }
      if (matched.pitch) pitchBiasSemitones += matched.pitch * factor;
      i += matchLen;
    } else {
      i++;
    }
    pendingMultiplier = 1;
    pendingNegate = 1;
  }

  for (const key of DELTA_KEYS) {
    if (deltas[key] !== undefined) {
      deltas[key] = Math.max(-0.85, Math.min(0.85, deltas[key]!));
    }
  }
  pitchBiasSemitones = Math.max(-7, Math.min(7, pitchBiasSemitones));

  const note = prompt.match(/\b([a-g])([#b]?)([0-5])\b/i);
  let absolutePitchHz: number | undefined;
  if (note) {
    const semitone = ({ c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 } as Record<string, number>)[note[1].toLowerCase()];
    const midi = (Number(note[3]) + 1) * 12 + semitone + (note[2] === '#' ? 1 : note[2] === 'b' ? -1 : 0);
    absolutePitchHz = 440 * 2 ** ((midi - 69) / 12);
    matchedTokens.push(note[0].toUpperCase());
  }
  const duration = prompt.match(/\b(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|sec(?:onds?)?)\b/i);
  const decaySeconds = duration ? Math.max(.01,Math.min(4, Number(duration[1]) * (/^m/i.test(duration[2]) ? .001 : 1))) : undefined;
  if (duration) matchedTokens.push(duration[0]);
  return { deltas, pitchBiasSemitones, matchedTokens, absolutePitchHz, source: prompt, decaySeconds };
}
