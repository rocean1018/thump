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
  { key: 'resonance', label: 'Resonance', left: 'flat', right: 'ringing' },
  { key: 'distortion', label: 'Distortion', left: 'clean', right: 'saturated' },
  { key: 'grit', label: 'Grit', left: 'smooth', right: 'crushed' },
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
    <div className="rounded-sm border-2 border-ember/40 bg-panel p-5 animate-rise shadow-plate">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-lg text-ember2 tracking-tight">REFINE</h3>
        <button
          type="button"
          onClick={onRegenerate}
          className="btn-hard font-mono text-[10px] uppercase tracking-wider text-white/50 hover:text-acid border-2 border-line rounded-sm px-2.5 py-1.5 transition-colors"
          title="Discard these three variations and synthesize a brand new set"
        >
          ↻ regenerate all
        </button>
      </div>
      <p className="font-mono text-[11px] leading-relaxed text-white/35 mb-4">
        Reshapes the selected sound without changing its identity — same seed, new parameters.
      </p>

      <div className="h-16 mb-3 rounded-sm border border-line2/60 bg-void px-2 scanlines">
        <Waveform buffer={buffer} isPlaying={isPlaying} playedColor="#4fd6c4" />
      </div>

      <button
        type="button"
        onClick={onPlayToggle}
        disabled={!buffer}
        className="btn-hard w-full mb-5 rounded-sm border-2 border-signalDeep bg-signal/10 py-2.5 font-mono text-xs uppercase tracking-wider text-signal hover:bg-signal/20 transition-colors disabled:opacity-40"
      >
        {isPlaying ? '■ stop' : isRefining ? '· rendering ·' : '▸ play refined sound'}
      </button>

      <div className="space-y-4">
        {SLIDERS.map((s) => (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={`slider-${s.key}`} className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/60">
                {s.label}
              </label>
              <span className="font-mono text-[11px] text-acid bg-void border border-line2/80 rounded-[2px] px-1.5 py-0.5 min-w-[2.6rem] text-center tabular-nums">
                {Math.round(params[s.key] * 100)}
              </span>
            </div>
            <input
              id={`slider-${s.key}`}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={params[s.key]}
              onChange={(e) => onChange(s.key, Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between font-mono text-[9px] uppercase tracking-wide text-white/25 mt-1">
              <span>{s.left}</span>
              <span>{s.right}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
