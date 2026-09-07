import type { SoundRecipe } from '../../types';
import { snareVoice, voiceRecipe } from './voices';

export const synthesizeSnare = snareVoice;
export function makeSnareRecipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  return voiceRecipe('snare', seed, basePitchHz, params);
}
