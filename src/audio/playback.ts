import { getAudioContext } from './context';

let masterGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;

/** Shared master chain: every played buffer routes through this so the
 * audio-reactive background always reflects whatever is actually audible. */
export function getMasterChain(): { gain: GainNode; analyser: AnalyserNode } {
  const ctx = getAudioContext();
  if (!masterGain || !analyser) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);
  }
  return { gain: masterGain, analyser };
}

export interface PlaybackHandle {
  stop: () => void;
}

export function playBuffer(buffer: AudioBuffer, onEnded?: () => void): PlaybackHandle {
  const ctx = getAudioContext();
  const { gain } = getMasterChain();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(gain);
  let ended = false;
  source.onended = () => {
    if (!ended) {
      ended = true;
      onEnded?.();
    }
  };
  source.start();
  return {
    stop: () => {
      if (ended) return;
      ended = true;
      try {
        source.onended = null;
        source.stop();
      } catch {
        // already stopped — ignore
      }
    },
  };
}
