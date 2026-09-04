import type { CreativeParams } from '../types';
import Waveform from './Waveform';

interface SliderDef {
  key: keyof CreativeParams;
  label: string;
  left: string;
  right: string;
}

const SLIDERS: SliderDef[] = [
  { key: 'attack', label: 'Attack', left: 'soft', right: 'instant' },
  { key: 'decay', label: 'Decay', left: 'tight', right: 'long tail' },
  { key: 'punch', label: 'Punch', left: 'none', right: 'max thump' },
  { key: 'tone', label: 'Tone', left: 'dark', right: 'bright' },
  { key: 'distortion', label: 'Distortion', left: 'clean', right: 'saturated' },
];

interface Props {
  params: CreativeParams;
  onChange: (key: keyof CreativeParams, value: number) => void;
  buffer: AudioBuffer | null;
  isPlaying: boolean;
  isRefining: boolean;
  onPlayToggle: () => void;
  onRegenerate: () => void;
}

export default function RefinePanel({ params, onChange, buffer, isPlaying, isRefining, onPlayToggle, onRegenerate }: Props) {
  return (
    <div className="rounded-2xl border border-ember/30 bg-ember/[0.04] p-5 animate-rise">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold text-ember2">Refine</h3>
        <button
          type="button"
          onClick={onRegenerate}
          className="text-xs font-mono uppercase tracking-wider text-white/50 hover:text-signal border border-line rounded-full px-3 py-1 transition-colors"
          title="Discard these three variations and synthesize a brand new set"
        >
          ↻ Regenerate all
        </button>
      </div>
      <p className="text-xs text-white/40 mb-4">
        These controls reshape the selected sound without changing its identity. Want a different sound entirely?
        Regenerate.
      </p>

      <div className="h-16 mb-4 rounded-lg bg-void/40 border border-line px-2">
        <Waveform buffer={buffer} isPlaying={isPlaying} playedColor="#6ee7ff" />
      </div>

      <button
        type="button"
        onClick={onPlayToggle}
        disabled={!buffer}
        className="w-full mb-5 rounded-lg border border-signal/40 bg-signal/10 py-2 text-sm font-medium text-signal hover:bg-signal/20 transition-colors disabled:opacity-40"
      >
        {isPlaying ? 'Stop' : isRefining ? 'Rendering…' : 'Play refined sound'}
      </button>

      <div className="space-y-4">
        {SLIDERS.map((s) => (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={`slider-${s.key}`} className="text-sm font-medium text-white/80">
                {s.label}
              </label>
              <span className="text-xs font-mono text-white/35">{Math.round(params[s.key] * 100)}</span>
            </div>
            <input
              id={`slider-${s.key}`}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={params[s.key]}
              onChange={(e) => onChange(s.key, Number(e.target.value))}
              className="w-full accent-ember"
            />
            <div className="flex justify-between text-[10px] text-white/30 mt-0.5">
              <span>{s.left}</span>
              <span>{s.right}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
