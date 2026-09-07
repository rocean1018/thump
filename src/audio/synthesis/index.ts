import type { SoundRecipe } from '../../types';
import { makeOfflineCtx } from './common';
import { normalizeBuffer, trimSilence } from '../normalize';
import { synthesize808 } from './808';
import { synthesizeKick } from './kick';
import { synthesizeHihat } from './hihat';
import { synthesizeSnare } from './snare';

const ENGINES = {
  '808': synthesize808,
  kick: synthesizeKick,
  hihat: synthesizeHihat,
  snare: synthesizeSnare,
} as const;

/** Renders a recipe end-to-end: build graph -> render offline -> normalize -> trim tail. */
export async function renderRecipe(recipe: SoundRecipe): Promise<AudioBuffer> {
  const ctx = makeOfflineCtx(recipe.durationSec);
  const engine = ENGINES[recipe.instrument];
  engine(ctx, { ...recipe, basePitchHz: recipe.basePitchHz * 2 ** (((recipe.params.pitch ?? .5) - .5) * 24 / 12) });
  const rendered = await ctx.startRendering();
  return normalizeBuffer(trimSilence(rendered));
}
