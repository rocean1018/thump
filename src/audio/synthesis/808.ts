import type { SoundRecipe } from '../../types';
import { bassVoice, voiceRecipe } from './voices';

export const synthesize808 = bassVoice;
export function make808Recipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  return voiceRecipe('808', seed, basePitchHz, params);
}
