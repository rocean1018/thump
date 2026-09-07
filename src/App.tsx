import { lazy, Suspense, useState } from 'react';
import { INSTRUMENTS, DEFAULT_CREATIVE_PARAMS, type Instrument } from './types';
import { useAudioEngine } from './hooks/useAudioEngine';
import { usePlayback } from './hooks/usePlayback';
import { interpretPrompt } from './audio/promptParser';
import { chooseCharacter, getCharacter } from './audio/characters';
import ReferenceUpload from './components/ReferenceUpload';
import RefinePanel from './components/RefinePanel';
import ExportPanel from './components/ExportPanel';
import Waveform from './components/Waveform';
import Icon from './components/Icon';

const SoundSculpture = lazy(() => import('./components/SoundSculpture'));
const EXAMPLES: Record<Instrument, string[]> = {
  '808': ['Pure sine sub in F1, sustained, clean, no punch', 'Short clipped punchy 808 in F1', 'Reese 808, detuned and growling, long, F1'],
  kick: ['Deep round kick with a soft attack', 'Clicky tight kick with a hard attack', 'Hard clipped distorted kick'],
  hihat: ['Crisp closed hat, short and clean', 'Airy open hat with a long tail', 'Dark, dusty Memphis hat'],
  snare: ['Dry rimshot snare', 'Layered clap snare with a long tail', 'Full body warm snare'],
};
const EXAMPLE_LABELS: Record<Instrument, string[]> = {
  '808': ['Pure sub', 'Clipped punch', 'Reese'],
  kick: ['Round', 'Click', 'Clipped'],
  hihat: ['Closed', 'Open', 'Dusty'],
  snare: ['Rimshot', 'Clap', 'Full body'],
};
const LABELS = ['Original', 'Tighter', 'Fuller'];

export default function App() {
  const engine = useAudioEngine();
  const playback = usePlayback();
  const [motion, setMotion] = useState(true);
  const isGenerating = engine.stage === 'parsing-prompt' || engine.stage === 'synthesizing';
  const hasResults = engine.variations.some(Boolean);
  const selected = engine.selectedIndex !== null ? engine.variations[engine.selectedIndex] : null;
  const selectedId = selected?.recipe.id ?? null;
  const tokens = interpretPrompt(engine.prompt).matchedTokens;
  const intent = chooseCharacter(engine.instrument, engine.prompt);
  const understood = [...new Set([...intent.matches, ...tokens.filter(t => t !== '808')])];
  const completed = engine.variations.filter(Boolean).length;
  const params = engine.refineParams ?? DEFAULT_CREATIVE_PARAMS;
  function generate() { playback.stop(); engine.generate(); }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="./" aria-label="Thump home">thump<span className="brand-period">.</span></a>
        <div className="header-divider" />
        <span className="header-description">A playground for your next sound.</span>
        <div className="header-right"><span className="status-dot" />Made in your browser <span className="version">VOL. 01</span></div>
      </header>
      <main>
        <div className="workspace-heading"><span className="eyebrow">ONE-SHOT STUDIO</span><span className="session-label">NO PACKS. JUST POSSIBILITIES.</span></div>
        <div className="studio">
          <section className="composer" aria-label="Create a sound">
            <div className="composer-title"><h1>Find your<br /><span>own frequency.</span></h1><p>Put the sound in your head into words.</p></div>
            <div className="field-heading"><span className="step-number">01</span><span>Choose your instrument</span></div>
            <div className="instrument-switch" aria-label="Instrument">
              {INSTRUMENTS.map((item) => <button key={item.id} type="button" disabled={isGenerating} aria-pressed={engine.instrument === item.id} className={`instrument-button ${engine.instrument === item.id ? 'active' : ''}`} onClick={() => { playback.stop(); engine.setInstrument(item.id); }}>
                <Icon name={item.id} /><span>{item.label}</span>
              </button>)}
            </div>
            <label className="field-heading prompt-heading" htmlFor="sound-prompt"><span className="step-number">02</span><span>Describe the sound</span></label>
            <div className="prompt-box">
              <textarea id="sound-prompt" value={engine.prompt} maxLength={400} disabled={isGenerating} onChange={(e) => engine.setPrompt(e.target.value)} placeholder={EXAMPLES[engine.instrument][0]} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating && engine.referenceStatus !== 'analyzing') generate(); }} />
              <div className="prompt-bottom"><span><span className="tiny-dot" />{tokens.length ? `${tokens.length} sound ${tokens.length === 1 ? 'detail' : 'details'} recognized` : 'Your words shape the sound'}</span><span>{engine.prompt.length}/400</span></div>
            </div>
            <div className="prompt-interpretation" aria-live="polite"><strong>{intent.character.label}</strong><span>{engine.prompt.trim() && !understood.length ? 'No sound details matched. Try a direction below, then add tone, length, or pitch.' : understood.length ? 'Using: ' + understood.slice(0,7).join(' · ') : 'Default voice. Choose a direction or describe your own.'}</span></div>
            <div className="prompt-examples"><span>Try a different sound</span><div>{EXAMPLES[engine.instrument].map((example, i) => <button type="button" key={example} disabled={isGenerating} title={example} onClick={() => engine.setPrompt(example)}>{EXAMPLE_LABELS[engine.instrument][i]}<Icon name="arrow-small" /></button>)}</div></div>
            <ReferenceUpload status={engine.referenceStatus} analysis={engine.referenceAnalysis} error={engine.referenceError} onFile={engine.handleReferenceFile} disabled={isGenerating} />
            <button className="generate-button" type="button" onClick={generate} disabled={isGenerating || engine.referenceStatus === 'analyzing'}><Icon name={isGenerating ? 'loading' : 'spark'} /><span>{isGenerating ? `Creating sounds · ${completed}/3` : hasResults ? 'Generate again' : 'Generate sounds'}</span><span className="button-arrow">↗</span></button>
            <div className="generation-note" aria-live="polite">{isGenerating ? 'Shaping your three variations…' : '3 variations. Yours to shape.'}<span>⌘ / Ctrl ↵</span></div>
            {isGenerating && <div className="generation-progress" role="progressbar" aria-label="Sound generation" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={3}><span style={{ width: `${Math.max(5, completed / 3 * 100)}%` }} /></div>}
            {engine.error && <p className="error-message" role="alert">{engine.error}</p>}
          </section>
          <section className="sound-space" aria-label="Sound visualization and variations">
            <div className="scene-topline"><span><span className={`status-dot ${playback.playingId ? 'is-live' : ''}`} />{playback.playingId ? 'SOUND IN MOTION' : 'SOUND, TAKING SHAPE'}</span><button type="button" className="motion-toggle" onClick={() => setMotion(!motion)} aria-pressed={motion} aria-label="Animate 3D scene"><Icon name={motion ? 'pause' : 'play'} /> Motion {motion ? 'on' : 'off'}</button></div>
            <div className="sculpture-stage">
              <div className="scene-word" aria-hidden="true">{engine.instrument === 'hihat' ? 'HAT' : engine.instrument.toUpperCase()}</div>
              <Suspense fallback={<div className="scene-loading">Loading sound sculpture…</div>}><SoundSculpture instrument={engine.instrument} params={params} generating={isGenerating} motion={motion} /></Suspense>
              <span className="scene-coordinate top-left" aria-hidden="true">+</span><span className="scene-coordinate bottom-right" aria-hidden="true">+</span>
              <div className="scene-caption"><span>{engine.instrument === '808' ? 'LOW END / HIGH IMPACT' : engine.instrument === 'kick' ? 'THE HEARTBEAT' : engine.instrument === 'hihat' ? 'TEXTURE / MOVEMENT' : 'CUT THROUGH'}</span><span>01 — 04</span></div>
            </div>
            <div className="results-heading"><h2>Your variations <span>{hasResults ? '03' : '—'}</span></h2><span>{hasResults ? getCharacter(engine.variations.find(Boolean)!.recipe.instrument, engine.variations.find(Boolean)!.recipe.character).label + ' · Play to audition' : 'A little different. All you.'}</span></div>
            <div className="variation-grid">
              {engine.variations.map((v, i) => <article key={i} className={`variation-card ${engine.selectedIndex === i ? 'selected' : ''} ${!v ? 'empty' : ''}`}>
                <div className="variation-top"><span className="variation-number">0{i + 1}</span><span className="variation-name">{LABELS[i]}</span>{engine.selectedIndex === i && <span className="selected-dot" aria-label="Selected" />}</div>
                <div className="card-waveform">{v ? <Waveform buffer={v.buffer} isPlaying={playback.playingId === v.recipe.id} height={48} color={engine.selectedIndex === i ? '#b1aaa3' : '#666561'} playedColor="#ff7048" /> : <div className="empty-wave" aria-hidden="true">{Array.from({ length: 34 }, (_, j) => <i key={j} style={{ height: `${2 + Math.sin(j * 1.6) ** 2 * Math.exp(-j / 10) * 25}px` }} />)}</div>}</div>
                <div className="variation-bottom"><button type="button" className="play-button" disabled={!v || (engine.selectedIndex === i && engine.isRefining)} aria-label={`${playback.playingId === v?.recipe.id ? 'Stop' : 'Play'} variation ${i + 1}`} onClick={() => v && playback.toggle(v.recipe.id, v.buffer)}><Icon name={v && playback.playingId === v.recipe.id ? 'stop' : 'play'} /></button><span className="sample-duration">{v ? `${v.buffer.duration.toFixed(2)} s` : '—.— s'}</span><button type="button" className="select-button" disabled={!v || isGenerating} aria-pressed={engine.selectedIndex === i} onClick={() => { playback.stop(); engine.selectVariation(i); }}>{engine.selectedIndex === i ? 'Selected' : 'Select'}<Icon name={engine.selectedIndex === i ? 'check' : 'arrow-small'} /></button></div>
              </article>)}
            </div>
          </section>
        </div>
        <section className={`refinement-section ${!selected ? 'is-empty' : ''}`} aria-label="Refine your sound">
          <div className="refinement-intro"><span className="step-number">03</span><div><h2>Make it yours.</h2><p>{selected ? `Shaping ${LABELS[engine.selectedIndex!].toLowerCase()} · ${selected.recipe.instrument === 'hihat' ? 'hi-hat' : selected.recipe.instrument}` : 'Select a variation to fine-tune and download.'}</p></div><span className="refine-hint">SAME CHARACTER. YOUR TOUCH.</span></div>
          {selected && engine.refineParams ? <div className="refinement-layout"><RefinePanel params={engine.refineParams} onChange={(key, value) => { playback.stop(); engine.updateRefineParam(key, value); }} buffer={engine.refinedBuffer} isPlaying={selectedId !== null && playback.playingId === selectedId} isRefining={engine.isRefining} onPlayToggle={() => selectedId && engine.refinedBuffer && playback.toggle(selectedId, engine.refinedBuffer)} onRegenerate={generate} />
            <ExportPanel buffer={engine.refinedBuffer} instrument={selected.recipe.instrument} prompt={engine.generatedPrompt} disabled={engine.isRefining} />
          </div> : <div className="refinement-empty"><span>Attack</span><span>Decay</span><span>Punch</span><span>Tone</span><span>Distortion</span><span>Pitch</span><span className="refinement-empty-note">Every detail, dialed in.</span></div>}
        </section>
      </main>
      <footer className="site-footer"><span className="footer-brand">thump.</span><span>Less searching. More making.</span><span className="footer-privacy">Local synthesis · No account · Nothing uploaded</span></footer>
    </div>
  );
}
