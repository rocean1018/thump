# Thump

Describe a drum one-shot in plain language. Get three variations in seconds. Refine without losing the sound's identity. Export a DAW-ready WAV or MP3.

Everything happens in the browser: prompt interpretation, sound synthesis, reference-audio analysis, and audio encoding. There is no backend, no account, no API key, and nothing is ever uploaded — so hosting is free and there's nothing to keep running.

## How it works

### Studio update

- Real Three.js chrome resonator with continuous autonomous idle motion and animation driven by the actual playback signal. No mouse tracking. Motion can be paused and respects reduced-motion preferences.
- Seventeen original voice families, including distinct Spinz-inspired punch and Zay-inspired growl (not sample replicas). Band-limited harmonic layers, a clean bass foundation, weighted body/release envelopes, kick knock, hat contact, and snare wire/shell layers.
- Repeated descriptive synonyms do not pile up into extreme settings; “clipped” changes drive without unexpectedly shortening the sound.
- Three controlled takes: Original follows the prompt center, Tighter and Fuller explore nearby settings without random pitch drift.
- Corrected attack direction, gentler saturation, more distinct kick transients, improved 808 pitch envelopes, and independent seeded snare layers.
- Note prompts such as `F1`, plus a ±12-semitone pitch control. “No distortion,” “less distorted,” and “no tail” are recognized.
- Mono 24-bit WAV export; MP3 encoding runs in a worker so it does not freeze the scene.
- Generation/refinement/reference request guards prevent stale asynchronous results from replacing the current sound. Downloads wait for the displayed edits to finish.
- References are limited to 10 MB and 10 seconds, processed locally, and rejected if silent.

### Verification

`npm run build` checks types and produces the static site. `npm test` runs the browser workflow and DSP regression checks. Tests use desktop Chrome on macOS by default; set `CHROME_PATH` for another installation. The test server starts automatically.

Tests cover all four instruments, selection, playback, parameter editing, WAV and MP3 download, responsive overflow, prompt interpretation, tuning, clipping, endpoint silence, repeatable rendering within floating-point tolerance, recipe identity, and WAV headers. Musical taste and reference similarity still need producer listening feedback.

- **Synthesis** — Each instrument (808, kick, hi-hat, snare) has a dedicated procedural engine built on the Web Audio API (`src/audio/synthesis/`): oscillators with pitch envelopes, filtered noise, distortion via wave-shaping. No samples, no neural generation.
- **Prompt parsing** — A large hand-tuned lexicon (`src/audio/promptParser.ts`, 150+ entries) maps single words, multi-word phrases ("long tail", "boom bap"), and named regional/style archetypes (memphis, phonk, drill, opium...) onto deltas across all seven synthesis params. A single left-to-right pass also tracks intensity modifiers ("very", "slightly", "not too") and negation ("not", "without"), so "very dark" and "not too bright" push the same param in correctly different amounts. Inspectable and predictable rather than a black box — no network call, no LLM.
- **Reference audio (optional)** — If you upload a sound, it's decoded and analyzed entirely on-device (`src/audio/referenceAnalysis.ts`): fundamental pitch via autocorrelation, brightness via spectral centroid, attack/decay via its amplitude envelope. Those numbers nudge the synthesis recipe — this is not sample cloning. The decoded audio is discarded immediately after analysis; only a few numbers are kept in memory, and only for the current session.
- **Variations & identity** — Three variations come from one seeded "recipe" per sound (`src/audio/variationEngine.ts`). Selecting one and adjusting Attack/Decay/Punch/Tone/Resonance/Distortion/Grit re-renders that same seed with new parameters, so the sound's character stays put. Hitting "Regenerate" creates a genuinely new seed and a new set of three.
- **Export** — WAV is encoded with a small built-in PCM writer; MP3 uses [`@breezystack/lamejs`](https://www.npmjs.com/package/@breezystack/lamejs), both fully client-side.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Build

```bash
npm run build   # outputs static files to dist/
npm run preview # serve the production build locally to sanity-check it
```

## Deploy for free

The build output in `dist/` is plain static HTML/CSS/JS — any static host works. No environment variables, no server, no database.

### Vercel (recommended, zero config)

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output directory `dist` (Vercel usually detects this automatically).
4. Deploy — you get a free `*.vercel.app` URL.

Or from the CLI: `npx vercel` (follow the prompts).

### Netlify

1. Push to GitHub, then [app.netlify.com/start](https://app.netlify.com/start) → import the repo.
2. Build command: `npm run build`. Publish directory: `dist`.
3. Deploy — free `*.netlify.app` URL.

Or from the CLI: `npx netlify deploy --build --prod`.

### GitHub Pages

```bash
npm run build
npx gh-pages -d dist
```

(First run `npm i -D gh-pages`.) Enable Pages for the `gh-pages` branch in the repo settings. Because `vite.config.ts` uses `base: './'`, the build works from any subpath, including `username.github.io/repo-name/`.

### Cloudflare Pages

1. Connect the repo at [pages.cloudflare.com](https://pages.cloudflare.com).
2. Build command: `npm run build`. Output directory: `dist`.

All four are free for a personal/portfolio project at this traffic scale.

## Browser support

Requires the Web Audio API (`OfflineAudioContext`, `AudioContext`) — every modern desktop browser (Chrome, Edge, Firefox, Safari) supports this. Thump is designed for desktop use per the product brief; mobile layout is not a priority for the MVP.

## Privacy

- Reference audio is decoded and analyzed in-memory in the tab. It is never sent anywhere.
- The decoded audio buffer is discarded as soon as analysis produces its small numeric summary (pitch, brightness, envelope timing) — that summary is all that's kept, only for the current browser session, and it's gone on refresh.
- Generated sounds are yours — download and use them in your music. Thump makes no claim to clone or reproduce any specific copyrighted recording; it synthesizes new audio guided by your description and (optionally) the character of a reference.

## Project structure

```
src/
  audio/
    synthesis/        one engine per instrument + shared DSP helpers
    export/            WAV + MP3 encoders
    promptParser.ts     keyword → parameter mapping
    referenceAnalysis.ts   on-device pitch/brightness/envelope analysis
    variationEngine.ts   combines prompt + reference + seed into 3 recipes
    playback.ts         shared master audio chain (for playback + the reactive visual)
  components/          UI (instrument picker, prompt box, waveform, refine sliders, export)
  hooks/               useAudioEngine (orchestration/state), usePlayback
```
