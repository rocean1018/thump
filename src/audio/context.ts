let sharedCtx: AudioContext | null = null;

/** Lazily-created, user-gesture-safe AudioContext shared for playback + analysis. */
export function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    sharedCtx = new Ctor();
  }
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume();
  }
  return sharedCtx;
}

export const EXPORT_SAMPLE_RATE = 44100;
