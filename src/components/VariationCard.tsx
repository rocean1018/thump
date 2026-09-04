import type { Variation } from '../types';
import Waveform from './Waveform';

interface Props {
  index: number;
  variation: Variation | null;
  isPlaying: boolean;
  isSelected: boolean;
  onPlayToggle: () => void;
  onSelect: () => void;
}

export default function VariationCard({ index, variation, isPlaying, isSelected, onPlayToggle, onSelect }: Props) {
  const label = String.fromCharCode(65 + index); // A, B, C

  return (
    <div
      className={`relative overflow-hidden rounded-sm border-2 p-3 transition-colors duration-150 animate-rise ${
        isSelected ? 'border-ember bg-ember/[0.07] shadow-glow' : 'border-line bg-surface hover:border-line2'
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-6 font-display text-[5.5rem] leading-none text-white/[0.035] select-none"
      >
        {label}
      </span>

      <div className="relative flex items-center justify-between mb-2.5">
        <span className={`font-mono text-[11px] uppercase tracking-[0.2em] ${isSelected ? 'text-ember2' : 'text-white/45'}`}>
          Slot {label}
        </span>
        {isSelected && (
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-acid">
            <span className="w-1.5 h-1.5 rounded-full bg-acid shadow-acid animate-blink" />
            armed
          </span>
        )}
      </div>

      <div className="relative h-16 flex items-center rounded-sm border border-line2/60 bg-panel px-1.5 scanlines">
        {variation ? (
          <Waveform buffer={variation.buffer} isPlaying={isPlaying} />
        ) : (
          <div className="w-full h-3 rounded-sm bg-line/70 animate-pulseSlow" />
        )}
      </div>

      <div className="relative mt-2.5 flex gap-1.5">
        <button
          type="button"
          disabled={!variation}
          onClick={onPlayToggle}
          className="btn-hard flex-1 rounded-sm border-2 border-line2 bg-surface2 py-2 font-mono text-xs uppercase tracking-wider text-white/75 hover:border-signal/50 hover:text-signal transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPlaying ? '■ stop' : '▸ play'}
        </button>
        <button
          type="button"
          disabled={!variation}
          onClick={onSelect}
          className={`btn-hard flex-1 rounded-sm border-2 py-2 font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isSelected
              ? 'bg-ember border-emberDeep text-void'
              : 'bg-white/[0.04] border-line2 text-white/75 hover:border-ember/50 hover:text-ember2'
          }`}
        >
          {isSelected ? 'selected' : 'select'}
        </button>
      </div>
    </div>
  );
}
