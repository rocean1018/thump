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
    <div className="rounded-sm border-2 border-line bg-panel p-5 shadow-plate">
      <h3 className="font-display text-lg tracking-tight text-paper mb-1">BOUNCE</h3>
      <p className="font-mono text-[11px] text-white/35 mb-4">
        {buffer ? `${buffer.duration.toFixed(2)}s · ${buffer.sampleRate / 1000}khz · 16-bit` : 'select a variation first'}
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!buffer}
          onClick={exportWav}
          className="btn-hard rounded-sm bg-acid text-void font-mono text-xs uppercase tracking-wider py-3 border-2 border-acidDeep shadow-[0_4px_0_theme(colors.acidDeep)] hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ↓ download wav
        </button>
        <button
          type="button"
          disabled={!buffer || encodingMp3}
          onClick={exportMp3}
          className="btn-hard rounded-sm border-2 border-line2 bg-surface2 font-mono text-xs uppercase tracking-wider py-3 text-white/75 hover:border-white/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {encodingMp3 ? '· encoding ·' : '↓ download mp3'}
        </button>
      </div>
    </div>
  );
}
