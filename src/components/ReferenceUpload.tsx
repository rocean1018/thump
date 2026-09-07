import { useRef, useState } from 'react';
import type { ReferenceAnalysis } from '../types';
import Icon from './Icon';
interface Props { status: 'idle' | 'analyzing' | 'ready' | 'error'; analysis: ReferenceAnalysis | null; error: string | null; onFile: (file: File | null) => void; disabled?: boolean }
export default function ReferenceUpload({ status, analysis, error, onFile, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return <div>
    <input ref={input} type="file" aria-label="Reference audio" accept="audio/*" hidden disabled={disabled} onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (file) onFile(file); }} />
    <div className={`reference-zone ${drag ? 'drag-over' : ''}`} onDragOver={e => { e.preventDefault(); if (!disabled) setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); if (!disabled && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}>
      <Icon name={status === 'analyzing' ? 'loading' : 'upload'} />
      <div className="reference-copy"><strong>{analysis ? analysis.fileName : status === 'analyzing' ? 'Listening to your reference…' : 'Add a reference sound'}</strong><small>{analysis ? `${analysis.durationSec.toFixed(2)} s · ${analysis.fundamentalHz ? Math.round(analysis.fundamentalHz) + ' Hz · ' : ''}ready` : 'Optional · Drop audio here'}</small></div>
      {analysis || status === 'analyzing' ? <button type="button" disabled={disabled} aria-label="Remove reference" onClick={() => onFile(null)}><Icon name="close" /></button> : <button className="browse-button" type="button" disabled={disabled} onClick={() => input.current?.click()}>Browse</button>}
    </div>
    {error && <p className="error-message" role="alert">{error}</p>}
    <p className="reference-privacy">Stays on your device. WAV or MP3, up to 10 MB / 10 s.</p>
  </div>;
}
