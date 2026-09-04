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
        <label className="block text-xs font-mono uppercase tracking-wider text-white/40">
          Reference audio <span className="text-white/25">(optional)</span>
        </label>
        {analysis && (
          <button
            type="button"
            onClick={() => onFile(null)}
            className="text-xs text-white/40 hover:text-ember2 transition-colors"
          >
            Remove
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
          className={`rounded-xl border border-dashed px-4 py-4 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-signal bg-signal/5' : 'border-line/80 bg-surface hover:border-white/25'
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
            <p className="text-sm text-white/60 animate-pulseSlow">Analyzing locally…</p>
          ) : (
            <p className="text-sm text-white/45">
              Drop a sound here or <span className="text-signal">browse</span> — analyzed in your browser only
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-signal/30 bg-signal/5 px-4 py-3 animate-rise">
          <p className="text-sm text-white truncate">{analysis.fileName}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50 font-mono">
            <span>{analysis.durationSec.toFixed(2)}s</span>
            {analysis.fundamentalHz && <span>~{Math.round(analysis.fundamentalHz)}Hz</span>}
            <span>attack {Math.round(analysis.attackSec * 1000)}ms</span>
            <span>brightness {Math.round(analysis.spectralCentroidHz)}Hz</span>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-ember2">{error}</p>}
      <p className="mt-2 text-[11px] leading-snug text-white/30">
        Processed on-device for pitch, brightness, and envelope shape — never uploaded, and discarded once analysis
        completes.
      </p>
    </div>
  );
}
