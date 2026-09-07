import type { ReferenceAnalysis } from '../types';
import { getAudioContext } from './context';

/**
 * All reference-audio analysis happens locally in the browser via the Web Audio
 * API's decodeAudioData + plain-JS DSP below. The file's samples never leave
 * the tab. We keep only the small derived ReferenceAnalysis summary in memory
 * and drop the decoded buffer as soon as analysis finishes (see useAudioEngine).
 */
export async function decodeReferenceFile(file: File): Promise<AudioBuffer> {
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Choose an audio file under 10 MB.');
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  // decodeAudioData detaches/copies internally; we don't retain arrayBuffer after this.
  let decoded: AudioBuffer;
  try { decoded = await ctx.decodeAudioData(arrayBuffer); }
  catch { throw new Error('Could not read this file. Try WAV or MP3.'); }
  if (decoded.duration > 10) throw new Error('Use a one-shot reference of 10 seconds or less.');
  return decoded;
}

function toMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0).slice();
  const out = new Float32Array(buffer.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) out[i] += data[i] / buffer.numberOfChannels;
  }
  return out;
}

function rmsEnvelope(mono: Float32Array, sampleRate: number, frameMs = 5): { times: number[]; values: number[] } {
  const frameSize = Math.max(1, Math.floor((sampleRate * frameMs) / 1000));
  const times: number[] = [];
  const values: number[] = [];
  for (let i = 0; i < mono.length; i += frameSize) {
    const end = Math.min(mono.length, i + frameSize);
    let sum = 0;
    for (let j = i; j < end; j++) sum += mono[j] * mono[j];
    values.push(Math.sqrt(sum / (end - i)));
    times.push(i / sampleRate);
  }
  return { times, values };
}

/**
 * Time-domain pitch detection via normalized cross-correlation (NCC).
 *
 * Raw (unnormalized) autocorrelation is biased toward the shortest lag tested
 * for any smooth/band-limited signal — adjacent samples always look alike —
 * so it tends to just return `minLag` regardless of the actual pitch period.
 * Verified this against a real drum-kit reference: unnormalized correlation
 * consistently reported ~1200Hz "fundamentals" for 808s that were actually
 * 30-45Hz. Normalizing by each compared segment's energy removes that bias.
 */
function detectFundamental(mono: Float32Array, sampleRate: number, startSample: number): number | null {
  const frameSize = 4096;
  const end = Math.min(mono.length, startSample + frameSize);
  const frame = mono.subarray(startSample, end);
  if (frame.length < 1024) return null;

  const minHz = 25;
  const maxHz = 400; // drum fundamentals live well below this
  const maxLag = Math.floor(sampleRate / minHz);
  const minLag = Math.floor(sampleRate / maxHz);

  let bestLag = -1;
  let bestScore = 0;
  for (let lag = minLag; lag <= Math.min(maxLag, frame.length - 1); lag++) {
    let corr = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i < frame.length - lag; i++) {
      corr += frame[i] * frame[i + lag];
      e1 += frame[i] * frame[i];
      e2 += frame[i + lag] * frame[i + lag];
    }
    const denom = Math.sqrt(e1 * e2);
    const score = denom > 1e-9 ? corr / denom : 0;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  // Require a reasonably strong periodic match — noise-dominated sounds
  // (hi-hats, snares) genuinely have no clear fundamental, and should report
  // none rather than a spurious low-confidence one.
  if (bestLag <= 0 || bestScore < 0.35) return null;
  return sampleRate / bestLag;
}

/** Naive DFT magnitude spectrum on a Hann-windowed frame — spectral centroid = "brightness". */
function spectralCentroid(mono: Float32Array, sampleRate: number, startSample: number): number {
  const frameSize = 1024;
  const end = Math.min(mono.length, startSample + frameSize);
  const n = end - startSample;
  if (n < 64) return 2000;

  const windowed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    windowed[i] = mono[startSample + i] * w;
  }

  const numBins = Math.floor(n / 2);
  let weightedSum = 0;
  let magSum = 0;
  for (let k = 1; k < numBins; k++) {
    let re = 0;
    let im = 0;
    const w = (2 * Math.PI * k) / n;
    for (let i = 0; i < n; i++) {
      re += windowed[i] * Math.cos(w * i);
      im -= windowed[i] * Math.sin(w * i);
    }
    const mag = Math.sqrt(re * re + im * im);
    const freq = (k * sampleRate) / n;
    weightedSum += freq * mag;
    magSum += mag;
  }
  return magSum > 0 ? weightedSum / magSum : 2000;
}

export function analyzeReference(buffer: AudioBuffer, fileName: string): ReferenceAnalysis {
  const mono = toMono(buffer);
  const sampleRate = buffer.sampleRate;
  const { times, values } = rmsEnvelope(mono, sampleRate);

  let peakIdx = 0;
  let peakVal = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > peakVal) {
      peakVal = values[i];
      peakIdx = i;
    }
  }
  if (peakVal < .00001) throw new Error('This reference is silent. Choose an audible sound.');
  const onsetIdx = values.findIndex(v => v >= peakVal * .025);
  const attackSec = Math.max(0, (times[peakIdx] ?? 0) - (times[Math.max(0, onsetIdx)] ?? 0));

  const decayTarget = peakVal * 0.1; // -20dB
  let decayIdx = values.length - 1;
  for (let i = peakIdx; i < values.length; i++) {
    if (values[i] <= decayTarget) {
      decayIdx = i;
      break;
    }
  }
  const decaySec = Math.max(0.02, (times[decayIdx] ?? buffer.duration) - (times[peakIdx] ?? 0));

  const peakSample = Math.floor((times[peakIdx] ?? 0) * sampleRate);
  // Sample a bit past the peak for pitch detection — right at the peak, a
  // broadband click/transient dominates and swamps the periodic signal the
  // fundamental-detector is looking for.
  const pitchSample = Math.min(mono.length - 2048, peakSample + Math.floor(sampleRate * 0.08));
  const fundamentalHz = detectFundamental(mono, sampleRate, Math.max(0, pitchSample));
  const centroidHz = spectralCentroid(mono, sampleRate, peakSample);

  let peakLevel = 0;
  for (let i = 0; i < mono.length; i++) peakLevel = Math.max(peakLevel, Math.abs(mono[i]));

  return {
    fileName,
    durationSec: buffer.duration,
    fundamentalHz,
    spectralCentroidHz: centroidHz,
    attackSec,
    decaySec,
    peakLevel,
  };
}
