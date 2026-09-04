const QUICK_TAGS = ['dark', 'punchy', 'long-tailed', 'clipped', 'metallic', 'warm', 'tight', 'distorted'];

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function PromptInput({ value, onChange, disabled }: Props) {
  const addTag = (tag: string) => {
    const words = value.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.includes(tag)) return;
    onChange(value.trim().length > 0 ? `${value.trim()} ${tag}` : tag);
  };

  return (
    <div>
      <label htmlFor="prompt" className="block text-xs font-mono uppercase tracking-wider text-white/40 mb-2">
        Describe the sound
      </label>
      <textarea
        id="prompt"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. dark, punchy 808 with a long tail and a bit of grit"
        rows={2}
        maxLength={220}
        className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-ember/50 focus:border-ember/60 transition-colors disabled:opacity-50"
      />
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            disabled={disabled}
            onClick={() => addTag(tag)}
            className="rounded-full border border-line bg-surface2 px-2.5 py-1 text-xs text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40"
          >
            + {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
