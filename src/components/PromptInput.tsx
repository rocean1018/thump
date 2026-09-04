const QUICK_TAGS = ['dark', 'punchy', 'long tail', 'metallic', 'dusty', 'resonant', 'boom bap', 'phonk', 'tight', 'distorted'];

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function PromptInput({ value, onChange, disabled }: Props) {
  const addTag = (tag: string) => {
    if (value.toLowerCase().includes(tag)) return;
    onChange(value.trim().length > 0 ? `${value.trim()} ${tag}` : tag);
  };

  return (
    <div>
      <label htmlFor="prompt" className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2">
        <span className="w-1 h-1 bg-ember rounded-full" />
        Describe the sound
      </label>
      <textarea
        id="prompt"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="dark, punchy 808 with a long tail and a bit of grit"
        rows={2}
        maxLength={220}
        className="w-full resize-none rounded-sm border-2 border-line bg-panel px-3.5 py-3 text-[15px] leading-relaxed text-paper placeholder:text-white/25 focus:outline-none focus:border-ember/70 transition-colors disabled:opacity-50"
      />
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            disabled={disabled}
            onClick={() => addTag(tag)}
            className="rounded-sm border border-line bg-surface2 px-2 py-0.5 font-mono text-[11px] text-white/50 hover:text-acid hover:border-acid/50 transition-colors disabled:opacity-40"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
