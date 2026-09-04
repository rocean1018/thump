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
      className={`rounded-2xl border p-4 transition-all duration-200 animate-rise ${
        isSelected ? 'border-ember bg-ember/[0.06] shadow-glow' : 'border-line bg-surface hover:border-white/20'
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`font-display text-sm font-semibold ${isSelected ? 'text-ember2' : 'text-white/70'}`}>
          Variation {label}
        </span>
        {isSelected && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-ember2 border border-ember/40 rounded-full px-2 py-0.5">
            Selected
          </span>
        )}
      </div>

      <div className="h-16 flex items-center">
        {variation ? (
          <Waveform buffer={variation.buffer} isPlaying={isPlaying} />
        ) : (
          <div className="w-full h-4 rounded bg-line/60 animate-pulseSlow" />
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!variation}
          onClick={onPlayToggle}
          className="flex-1 rounded-lg border border-line bg-surface2 py-2 text-sm font-medium hover:border-white/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        <button
          type="button"
          disabled={!variation}
          onClick={onSelect}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isSelected ? 'bg-ember text-black' : 'bg-white/5 hover:bg-white/10 text-white'
          }`}
        >
          {isSelected ? 'Refining' : 'Select'}
        </button>
      </div>
    </div>
  );
}
