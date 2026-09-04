import { useRef, useState, type DragEvent } from 'react';
import type { ReferenceAnalysis } from '../types';

interface Props {
  status: 'idle' | 'analyzing' | 'ready' | 'error';
  analysis: ReferenceAnalysis | null;
  error: string | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}

export default function ReferenceUpload({ status, analysis, error, onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    onFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
          <span className="w-1 h-1 bg-ember rounded-full" />
          Reference input <span className="text-white/25">(optional)</span>
        </label>
        {analysis && (
          <button
            type="button"
            onClick={() => onFile(null)}
            className="font-mono text-[10px] uppercase tracking-wider text-white/40 hover:text-ember2 transition-colors"
          >
            Eject
          </button>
        )}
      </div>

      {!analysis ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          className={`relative rounded-sm border-2 border-dashed px-4 py-4 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-signal bg-signal/5' : 'border-line bg-panel hover:border-line2'
          } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {status === 'analyzing' ? (
            <p className="font-mono text-xs text-signal animate-pulseSlow">analyzing locally…</p>
          ) : (
            <p className="font-mono text-xs text-white/40">
              drop audio to slot <span className="text-signal">or browse</span>
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-sm border-2 border-signal/40 bg-signal/[0.06] px-4 py-3 animate-rise">
          <p className="text-sm text-paper truncate">{analysis.fileName}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wide text-signal/80">
            <span>{analysis.durationSec.toFixed(2)}s</span>
            {analysis.fundamentalHz && <span>~{Math.round(analysis.fundamentalHz)}hz</span>}
            <span>atk {Math.round(analysis.attackSec * 1000)}ms</span>
            <span>bright {Math.round(analysis.spectralCentroidHz)}hz</span>
          </div>
        </div>
      )}
      {error && <p className="mt-2 font-mono text-xs text-ember2">{error}</p>}
      <p className="mt-2 text-[10px] leading-snug text-white/25">
        Analyzed on-device for pitch, brightness, and envelope shape — never uploaded, discarded once analysis
        completes.
      </p>
    </div>
  );
}
