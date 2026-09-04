export default function Header() {
  return (
    <header className="flex items-end justify-between mb-8 pb-5 border-b-2 border-line">
      <div className="flex items-end gap-4">
        <div>
          <h1 className="font-display text-[2.6rem] sm:text-5xl leading-[0.8] tracking-tight text-paper">
            THUMP
          </h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">
            drum one-shot synthesizer <span className="text-acid">/</span> model&nbsp;TH-1
          </p>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-acid shadow-acid animate-pulseSlow" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 border border-line px-2.5 py-1">
          no server · no upload · runs in-browser
        </span>
      </div>
    </header>
  );
}
