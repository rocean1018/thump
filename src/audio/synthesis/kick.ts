import type { SoundRecipe } from '../../types';
import { kickVoice, voiceRecipe } from './voices';

export const synthesizeKick = kickVoice;
export function makeKickRecipe(seed: number, basePitchHz: number, params: SoundRecipe['params']): SoundRecipe {
  return voiceRecipe('kick', seed, basePitchHz, params);
}
