import { Mp3Encoder } from '@breezystack/lamejs';

/** Encodes a mono AudioBuffer to an MP3 Blob entirely client-side. */
export function audioBufferToMp3Blob(buffer: AudioBuffer, kbps = 192): Blob {
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);

  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const chunkSize = 1152; // lame frame size
  const mp3Chunks: Uint8Array[] = [];

  for (let i = 0; i < int16.length; i += chunkSize) {
    const chunk = int16.subarray(i, i + chunkSize);
    const encoded = encoder.encodeBuffer(chunk);
    if (encoded.length > 0) mp3Chunks.push(new Uint8Array(encoded));
  }
  const finalChunk = encoder.flush();
  if (finalChunk.length > 0) mp3Chunks.push(new Uint8Array(finalChunk));

  return new Blob(mp3Chunks as BlobPart[], { type: 'audio/mpeg' });
}
