interface Props {
  onClick: () => void;
  isGenerating: boolean;
  hasResults: boolean;
}

export default function GenerateButton({ onClick, isGenerating, hasResults }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isGenerating}
      className="btn-hard w-full rounded-sm bg-ember text-void font-display text-sm sm:text-base py-4 tracking-tight border-2 border-emberDeep shadow-[0_5px_0_theme(colors.emberDeep),0_0_40px_-14px_rgba(255,67,16,0.7)] hover:brightness-110 disabled:opacity-60 disabled:cursor-wait disabled:hover:brightness-100"
    >
      {isGenerating ? 'GENERATING…' : hasResults ? '▸ GENERATE AGAIN' : '▸ GENERATE 3 VARIATIONS'}
    </button>
  );
}
