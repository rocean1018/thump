import type { SoundRecipe } from '../../types';
import { hatVoice, voiceRecipe } from './voices';

export const synthesizeHihat = hatVoice;
export function makeHihatRecipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  return voiceRecipe('hihat', seed, basePitchHz, params);
}
