import AudioReactiveBackground from './components/AudioReactiveBackground';
import Header from './components/Header';
import InstrumentSelector from './components/InstrumentSelector';
import PromptInput from './components/PromptInput';
import ReferenceUpload from './components/ReferenceUpload';
import GenerateButton from './components/GenerateButton';
import ProgressIndicator from './components/ProgressIndicator';
import VariationGrid from './components/VariationGrid';
import RefinePanel from './components/RefinePanel';
import ExportPanel from './components/ExportPanel';
import { useAudioEngine } from './hooks/useAudioEngine';
import { usePlayback } from './hooks/usePlayback';

export default function App() {
  const engine = useAudioEngine();
  const playback = usePlayback();

  const isGenerating = engine.stage === 'parsing-prompt' || engine.stage === 'synthesizing';
  const hasResults = engine.variations.some(Boolean);
  const selected = engine.selectedIndex !== null ? engine.variations[engine.selectedIndex] : null;
  const selectedId = selected?.recipe.id ?? null;

  const handleGenerate = () => {
    playback.stop();
    engine.generate();
  };

  const handleRegenerate = () => {
    playback.stop();
    engine.regenerate();
  };

  return (
    <div className="min-h-screen">
      <AudioReactiveBackground />
      <div className="grain-overlay" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="relative border-2 border-line rounded-sm bg-void/40 p-4 sm:p-7">
          <span className="corner-rivet -top-[3px] -left-[3px]" />
          <span className="corner-rivet -top-[3px] -right-[3px]" />
          <span className="corner-rivet -bottom-[3px] -left-[3px]" />
          <span className="corner-rivet -bottom-[3px] -right-[3px]" />

          <Header />

          <main className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            <section className="space-y-5" aria-label="Sound description">
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2">
                  <span className="w-1 h-1 bg-ember rounded-full" />
                  Instrument
                </label>
                <InstrumentSelector value={engine.instrument} onChange={engine.setInstrument} disabled={isGenerating} />
              </div>

              <PromptInput value={engine.prompt} onChange={engine.setPrompt} disabled={isGenerating} />

              <ReferenceUpload
                status={engine.referenceStatus}
                analysis={engine.referenceAnalysis}
                error={engine.referenceError}
                onFile={engine.handleReferenceFile}
                disabled={isGenerating}
              />

              <GenerateButton onClick={handleGenerate} isGenerating={isGenerating} hasResults={hasResults} />

              <ProgressIndicator stage={engine.stage} variations={engine.variations} />

              {engine.error && (
                <div className="rounded-sm border-2 border-ember/50 bg-ember/10 px-4 py-3 font-mono text-xs text-ember2">
                  {engine.error}
                </div>
              )}
            </section>

            <section className="space-y-5" aria-label="Variations and refinement">
              {hasResults ? (
                <>
                  <VariationGrid
                    variations={engine.variations}
                    selectedIndex={engine.selectedIndex}
                    playingId={playback.playingId}
                    onPlayToggle={(_, v) => playback.toggle(v.recipe.id, v.buffer)}
                    onSelect={(i) => {
                      playback.stop();
                      engine.selectVariation(i);
                    }}
                  />

                  {selected && engine.refineParams && (
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-4 items-start">
                      <RefinePanel
                        params={engine.refineParams}
                        onChange={engine.updateRefineParam}
                        buffer={engine.refinedBuffer}
                        isPlaying={selectedId !== null && playback.playingId === selectedId}
                        isRefining={engine.isRefining}
                        onPlayToggle={() =>
                          selectedId && engine.refinedBuffer && playback.toggle(selectedId, engine.refinedBuffer)
                        }
                        onRegenerate={handleRegenerate}
                      />
                      <ExportPanel buffer={engine.refinedBuffer} instrument={engine.instrument} prompt={engine.prompt} />
                    </div>
                  )}
                </>
              ) : (
                <div className="relative h-full min-h-[280px] rounded-sm border-2 border-dashed border-line flex items-center justify-center text-center px-8 scanlines">
                  <p className="font-mono text-xs uppercase tracking-wider leading-relaxed text-white/25 max-w-xs">
                    pick an instrument · describe the sound · hit generate
                    <br />
                    <span className="text-white/15">three variations land here in seconds</span>
                  </p>
                </div>
              )}
            </section>
          </main>

          <footer className="mt-12 pt-5 border-t-2 border-line font-mono text-[10px] uppercase tracking-wide text-white/25 leading-relaxed">
            100% procedural synthesis, rendered in your browser — no neural generation, no account, nothing uploaded.
            Generated sounds are yours to use.
          </footer>
        </div>
      </div>
    </div>
  );
}
