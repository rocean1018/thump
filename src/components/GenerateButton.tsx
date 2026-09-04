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
      className="w-full rounded-xl bg-ember text-black font-display font-semibold text-base py-3.5 hover:bg-ember2 active:scale-[0.99] transition-all duration-150 shadow-glow disabled:opacity-60 disabled:cursor-wait"
    >
      {isGenerating ? 'Generating…' : hasResults ? 'Generate again' : 'Generate 3 variations'}
    </button>
  );
}
