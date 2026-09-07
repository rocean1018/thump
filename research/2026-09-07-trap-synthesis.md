# Trap drum synthesis: research and implementation

## Summary

The previous engine used a single topology per instrument. Named timbres such as rimshot, clap, and Reese were ignored. Tightening variation jitter did not fix that limitation. The revised design chooses a synthesis family first, then applies descriptive controls, note tuning, and an optional reference.

## Key facts and sources

- [Splice / Isaac Duarte, How to make a trap beat in FL Studio, August 12, 2026](https://splice.com/blog/how-to-make-trap-beat-fl-studio/): describes dirty sub-basses, punchy kicks, crisp hats, and snappy snares. Sound choice matters before mixing. This supports distinct voice construction, rather than a universal drum graph.
- [Splice, The 8 types of 808s, August 7, 2026](https://splice.com/blog/8-levels-808s/): distinguishes sustained notes, gliding and reverse-gliding treatments. Several examples are sequence-level techniques; Thump stays one-shot-only and implements an internal downward pitch sweep rather than claiming MIDI legato.
- [Roland, Sound Design: EDM Classics with the SYSTEM-8, Trap Bass section](https://articles.roland.com/sound-design-edm-classics-with-the-system-8/): uses sine/triangle sub oscillation, long decay, drive with restrained tone, and a small fast pitch envelope for onset. The clean bass family and driven bass branch follow those principles.
- [Ableton Live 12 manual, Saturator](https://www.ableton.com/en/manual/live-audio-effect-reference/#saturator): distinguishes soft/hard clipping and other nonlinear curves, and explains oversampling's quality/CPU trade-off. Thump uses oversampled soft/hard drive with a real dry/wet path, ahead of the bass amplitude envelope.
- [Renraku, Modern Trap Essentials catalog](https://splice.com/sounds/packs/renraku/modern-trap-essentials/samples): the creator's catalog separates 808s, kicks, snares, claps, rims, and closed/open hats. Catalog descriptors support coverage choices, not exact synthesis settings.
- [Producer Devon Johnson via Splice, Analog vs. digital drum sound design, April 12, 2024](https://splice.com/blog/analog-vs-digital-drum-sound-design/): demonstrates separate kick, hat, snare and clap workflows. The article links a video; this research used its text and did not claim to transcribe or listen to that video.

## Engineering decisions

These are original implementation choices inferred from the sources, not transcriptions of commercial samples or universal definitions of modern trap.

- Bass families: pure sine sub, percussive punch, driven harmonic 808, downward slide, and detuned Reese bass. Preserve a sine fundamental; add upper harmonics intentionally.
- Kick families: round low body, short click/beater, and clipped knock. Separate pitch/body and click envelopes.
- Hat families: short noise-led closed hat, full-length open sizzle, inharmonic metallic bank, and band-limited dusty noise. Do not force the same 40ms noise burst into open and closed hats.
- Snare families: noise-led trap snap, staggered clap bursts, tonal inharmonic rimshot, and fuller two-mode body snare.
- Shared logarithmic decay mapping across recipe length, synth envelopes, and reference fitting. Explicit numeric duration overrides the descriptive decay; these values specify the envelope's approximate -60dB endpoint, not total file length.
- Retain recipe character during slider refinement. A fresh prompt can choose a new family. Clean/negative constraints continue to reduce drive and grit.
- Display the chosen family and recognized words. Unmatched prompts disclose fallback instead of implying arbitrary language understanding.

## Verification

The same fixed-seed prompt set is rendered before and after the rewrite in real Chrome Web Audio. Tests compare envelope energy duration and spectral energy, not simply buffer hashes or the existence of a download. The old rimshot and clap prompts had the same envelope and effectively identical spectra. Revised voices differ in both.

Browser tests also cover user-visible prompt feedback, pitch/negative descriptors, clean outputs, non-clipping samples, identity-preserving edits, export, motion pause, and reduced motion. Waveform drawings are cached instead of re-applying per-bar blur each frame; the primary torus is reduced from 36,864 to 7,680 triangles. Motion advances on display frames, with adaptive render resolution.

Final local run: all five Playwright tests and the production build passed. Chrome recorded a 16.7ms median and 95th-percentile frame interval over 90 frames, with 12,288 scene triangles per frame. Paused and reduced-motion states issued no additional draw calls after settling. These timings do not measure performance on other devices.

Fixed-seed audio comparisons: the revised rimshot's 95%-energy time is 11.5ms versus the clap's 59.2ms, with spectral centroids of approximately 897Hz and 5,269Hz. The clean sub and clipped punch have 95%-energy times of 1.074s and 56.2ms. The tests retain rendered WAVs in ignored test output for producer listening; numeric checks are not a substitute for that judgment.

## Open questions / limits

### Follow-up: body and transient quality (engine v3)

The user's listening feedback showed that family separation alone was insufficient. The previous single exponential envelopes produced thin results: the click-kick test placed 95% of its energy within 9.2ms and the body snare within 32ms. Weighted onset/body/release envelopes now retain energy through the middle of the one-shot, without just raising the normalized peak. Those same tests now measure 33.2ms and 54.7ms, respectively. Their full-file RMS rises from .126 to .223 and .107 to .194 at the same .95 peak ceiling. These are density measurements, not a claim of subjective superiority.

Spinz-inspired and Zay-inspired original bass recipes now have separate finite harmonic spectra, a phase-locked sine foundation, and different envelope weights. The generic driven family remains separate. At F1, the named recipes retain 95%-energy durations of .460s and .578s and spectral centroids of 127Hz and 222Hz. No commercial reference samples were obtained or analyzed for this update; these are approximate design interpretations, not verified recreations of a particular kit. [Roland's trap-bass design walkthrough](https://articles.roland.com/sound-design-edm-classics-with-the-system-8/) supports the underlying sub-plus-coloration approach, not the named recipes' exact settings.

Kicks receive a stronger damped body and less dominant noise click. Hats retain a lower contact band beneath the sizzle. Snares/claps get independently damped shell/wire noise between their pitched body and bright tail. Duplicate length adjectives no longer accumulate, and clipping no longer implicitly shortens decay. Reference decay fitting accounts approximately for the new envelope shape.

Six browser tests now cover all 17 families at default and short/dark/long/bright extremes, default determinism, named-family density/separation, the full generation/edit/export workflow, and continuous idle animation with zero sculpture pointer listeners. Pausing and reduced-motion support remain intact.

### Remaining limits

- Procedural aliases such as Spinz or Zay select approximate original families; they are not sample clones.
- This is deterministic vocabulary/pattern parsing, not a neural text-to-audio model. Artist-only or arbitrary narrative requests may not map.
- Numeric signal differences do not establish that a producer likes a sound or that it fits a specific record. Producer A/B listening remains the final taste check.
- Reference analysis guides envelope, pitch and brightness; it does not extract a complete timbre or resynthesize an arbitrary uploaded sample.
- Browser frame timing depends on device, power mode, and host load. Measurements are local evidence, not a guarantee for every laptop.
