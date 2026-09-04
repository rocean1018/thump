export default function Header() {
  return (
    <header className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ember2 to-ember shadow-glow" />
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight leading-none">Thump</h1>
          <p className="text-[11px] text-white/35 font-mono leading-none mt-1">describe it. hear it. drag it in.</p>
        </div>
      </div>
      <span
        className="hidden sm:block text-xs font-mono text-white/30 border border-line rounded-full px-3 py-1.5 select-none"
        title="100% in-browser — no account, no server, no upload"
      >
        runs entirely in your browser
      </span>
    </header>
  );
}
