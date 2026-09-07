import { audioBufferToMp3Blob } from './mp3';
self.onmessage = (event: MessageEvent<{ samples: Float32Array; sampleRate: number }>) => {
  try {
    const { samples, sampleRate } = event.data;
    const buffer = { sampleRate, getChannelData: () => samples } as unknown as AudioBuffer;
    self.postMessage({ blob: audioBufferToMp3Blob(buffer) });
  } catch (e) { self.postMessage({ error: e instanceof Error ? e.message : 'Encoding failed' }); }
};
