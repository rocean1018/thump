import { INSTRUMENTS, type Instrument } from '../types';

interface Props {
  value: Instrument;
  onChange: (i: Instrument) => void;
  disabled?: boolean;
}

export default function InstrumentSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {INSTRUMENTS.map((inst, i) => {
        const active = inst.id === value;
        return (
          <button
            key={inst.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(inst.id)}
            aria-pressed={active}
            title={inst.blurb}
            className={`btn-hard group relative aspect-square rounded-sm border-2 transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed ${
              active
                ? 'border-ember bg-ember/15 shadow-glow'
                : 'border-line bg-surface hover:border-line2 hover:bg-surface2'
            }`}
          >
            <span
              className={`absolute top-1.5 left-1.5 font-mono text-[9px] tracking-wider ${
                active ? 'text-ember2' : 'text-white/30'
              }`}
            >
              0{i + 1}
            </span>
            <span
              className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
                active ? 'bg-acid shadow-acid' : 'bg-white/10'
              }`}
            />
            <span
              className={`absolute inset-x-0 bottom-2 font-display text-[13px] sm:text-sm leading-none tracking-tight ${
                active ? 'text-paper' : 'text-white/65'
              }`}
            >
              {inst.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
