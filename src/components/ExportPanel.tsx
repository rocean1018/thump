import { useState } from 'react';
import type { Instrument } from '../types';
import { audioBufferToWavBlob } from '../audio/export/wav';
import { downloadBlob, slugify } from '../lib/download';
import Icon from './Icon';
interface Props { buffer: AudioBuffer | null; instrument: Instrument; prompt: string; disabled?: boolean }
export default function ExportPanel({ buffer, instrument, prompt, disabled }: Props) {
  const [encoding, setEncoding] = useState(false);
  const [error, setError] = useState('');
  const filename = `thump-${instrument}-${slugify(prompt, 'sound')}`;
  const download = async (format: 'wav' | 'mp3') => {
    if (!buffer || disabled || encoding) return;
    setError(''); setEncoding(true);
    try {
      const blob = format === 'wav' ? audioBufferToWavBlob(buffer) : await new Promise<Blob>((resolve, reject) => {
        const worker = new Worker(new URL('../audio/export/mp3.worker.ts', import.meta.url), { type: 'module' });
        const timeout = setTimeout(() => { worker.terminate(); reject(new Error('Encoding timed out')); }, 15000);
        worker.onmessage = e => { clearTimeout(timeout); worker.terminate(); e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.blob); };
        worker.onerror = () => { clearTimeout(timeout); worker.terminate(); reject(new Error('Encoding failed')); };
        const data = buffer.getChannelData(0).slice();
        worker.postMessage({ samples: data, sampleRate: buffer.sampleRate }, [data.buffer]);
      });
      downloadBlob(blob, `${filename}.${format}`);
    } catch { setError('Download failed. Please retry or choose WAV.'); }
    finally { setEncoding(false); }
  };
  return <div className="export-panel"><h3>Take it to your DAW.</h3><p className="export-details">{buffer ? `${buffer.duration.toFixed(2)} s · ${buffer.sampleRate / 1000} kHz · Mono` : 'Select a sound'}<br />WAV 24-bit / MP3 192 kbps</p><button type="button" className="export-button" disabled={!buffer || disabled || encoding} onClick={() => download('wav')}><Icon name="download" />Download WAV</button><button type="button" className="export-button secondary" disabled={!buffer || disabled || encoding} onClick={() => download('mp3')}><Icon name={encoding ? 'loading' : 'download'} />{encoding ? 'Preparing download…' : 'Download MP3'}</button><p className="export-note">WAV keeps every detail. Ready for your next beat.</p>{error && <p role="alert" className="error-message">{error}</p>}</div>;
}
