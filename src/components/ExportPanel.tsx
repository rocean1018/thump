import { useState } from 'react';
import type { Instrument } from '../types';
import { audioBufferToWavBlob } from '../audio/export/wav';
import { audioBufferToMp3Blob } from '../audio/export/mp3';
import { downloadBlob, slugify } from '../lib/download';

interface Props {
  buffer: AudioBuffer | null;
  instrument: Instrument;
  prompt: string;
}

export default function ExportPanel({ buffer, instrument, prompt }: Props) {
  const [encodingMp3, setEncodingMp3] = useState(false);

  const filenameBase = `thump-${instrument}-${slugify(prompt, 'sound')}`;

  const exportWav = () => {
    if (!buffer) return;
    const blob = audioBufferToWavBlob(buffer);
    downloadBlob(blob, `${filenameBase}.wav`);
  };

  const exportMp3 = async () => {
    if (!buffer) return;
    setEncodingMp3(true);
    try {
      // Encoding is synchronous/CPU-bound; yield a frame first so the button's
      // "Encoding…" state actually paints before the main thread blocks.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const blob = audioBufferToMp3Blob(buffer);
      downloadBlob(blob, `${filenameBase}.mp3`);
    } finally {
      setEncodingMp3(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h3 className="font-display font-semibold mb-1">Export</h3>
      <p className="text-xs text-white/40 mb-4">
        {buffer ? `${buffer.duration.toFixed(2)}s · ${buffer.sampleRate / 1000}kHz · 16-bit` : 'Select a variation first'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!buffer}
          onClick={exportWav}
          className="flex-1 rounded-lg bg-ember text-black font-medium py-2.5 text-sm hover:bg-ember2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Download WAV
        </button>
        <button
          type="button"
          disabled={!buffer || encodingMp3}
          onClick={exportMp3}
          className="flex-1 rounded-lg border border-line bg-surface2 font-medium py-2.5 text-sm hover:border-white/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {encodingMp3 ? 'Encoding…' : 'Download MP3'}
        </button>
      </div>
    </div>
  );
}
