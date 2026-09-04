import { INSTRUMENTS, type Instrument } from '../types';

interface Props {
  value: Instrument;
  onChange: (i: Instrument) => void;
  disabled?: boolean;
}

export default function InstrumentSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {INSTRUMENTS.map((inst) => {
        const active = inst.id === value;
        return (
          <button
            key={inst.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(inst.id)}
            aria-pressed={active}
            className={`group relative rounded-xl border px-4 py-3 text-left transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
              active
                ? 'border-ember bg-ember/10 shadow-glow'
                : 'border-line bg-surface hover:border-white/25 hover:bg-surface2'
            }`}
          >
            <div className={`font-display font-semibold tracking-tight ${active ? 'text-ember2' : 'text-white'}`}>
              {inst.label}
            </div>
            <div className="mt-0.5 text-xs text-white/50 leading-snug hidden sm:block">{inst.blurb}</div>
          </button>
        );
      })}
    </div>
  );
}
