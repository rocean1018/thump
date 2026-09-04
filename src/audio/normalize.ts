/**
 * Post-render normalization + tail cleanup shared by every export/preview path.
 * Ensures: no clipping, no dead air at the head, a clean fade at the tail so
 * loop/one-shot triggers in a DAW don't click.
 */
export function normalizeBuffer(buffer: AudioBuffer, targetPeak = 0.95): AudioBuffer {
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
  }
  const out = new AudioBuffer({ length: data.length, numberOfChannels: 1, sampleRate: buffer.sampleRate });
  const outData = out.getChannelData(0);
  const gain = peak > 0.0001 ? targetPeak / peak : 1;

  // Micro fade-out over the last ~8ms to prevent a clicking tail edge.
  const fadeSamples = Math.min(data.length, Math.floor(buffer.sampleRate * 0.008));
  for (let i = 0; i < data.length; i++) {
    let sample = data[i] * gain;
    const distFromEnd = data.length - i;
    if (distFromEnd <= fadeSamples) {
      sample *= distFromEnd / fadeSamples;
    }
    outData[i] = sample;
  }
  return out;
}

/** Trims trailing near-silence beyond a small tail so exported files aren't padded with dead air. */
export function trimSilence(buffer: AudioBuffer, threshold = 0.0008, tailPadSec = 0.02): AudioBuffer {
  const data = buffer.getChannelData(0);
  let lastLoud = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (Math.abs(data[i]) > threshold) {
      lastLoud = i;
      break;
    }
  }
  const pad = Math.floor(buffer.sampleRate * tailPadSec);
  const end = Math.min(data.length, lastLoud + pad);
  if (end >= data.length - 1) return buffer;
  const out = new AudioBuffer({ length: end, numberOfChannels: 1, sampleRate: buffer.sampleRate });
  out.getChannelData(0).set(data.subarray(0, end));
  return out;
}
