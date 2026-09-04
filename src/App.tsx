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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Header />

        <main className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <section className="space-y-5" aria-label="Sound description">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/40 mb-2">
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
              <div className="rounded-xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember2">
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
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_280px] gap-4 items-start">
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
              <div className="h-full min-h-[280px] rounded-2xl border border-dashed border-line flex items-center justify-center text-center px-8">
                <p className="text-white/30 text-sm max-w-xs">
                  Pick an instrument, describe the sound, and hit generate. Three variations will show up here —
                  usually in a few seconds.
                </p>
              </div>
            )}
          </section>
        </main>

        <footer className="mt-14 pt-6 border-t border-line/60 text-[11px] text-white/25 leading-relaxed">
          Thump synthesizes every sound procedurally in your browser — there's no neural generation, no account, and
          nothing is uploaded to a server. Generated sounds are yours to use in your music.
        </footer>
      </div>
    </div>
  );
}
