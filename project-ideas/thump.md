# Thump — Pre-PRD

## Summary

Thump is a polished desktop web app for hobby beatmakers producing trap, rap, and underground rap. It helps producers create a specific drum one-shot in seconds instead of searching large sample libraries.

Users describe a sound with text and may optionally upload a reference. Thump generates three variations, lets the user select and refine one without losing its identity, and exports the result as WAV or MP3.

The MVP will use browser-native procedural synthesis and local audio analysis rather than neural audio generation. This keeps the product free to operate while leaving a clean extension point for neural generation later.

## Problem

Hobby producers often spend too much of a creative session browsing sample packs for an 808, kick, hi-hat, or snare that matches what they hear in their head. Traditional drum synthesizers provide precision, but they require sound-design knowledge and force users to translate creative language into technical controls.

Thump should reduce the distance between intent and a usable sound: describe it, audition several options, refine the best one, and download it.

## Solution

The MVP provides a focused one-shot workflow:

1. Choose 808, kick, hi-hat, or snare.
2. Describe the desired sound in natural language.
3. Optionally upload a reference sound.
4. Generate three distinct but relevant variations.
5. Audition and select one variation.
6. Adjust parameters such as attack, decay, punch, pitch or tone, and distortion while preserving the selected sound's recognizable character.
7. Explicitly regenerate when a new sound identity is desired.
8. Download a WAV or MP3 file.

The target generation time is no more than approximately 15 seconds for three variations. The interface should provide meaningful animated progress and, where technically possible, expose the first playable result before the full set completes.

## Target User

The initial user is a desktop-based hobby beatmaker working primarily in trap, rap, or underground rap. They use a DAW, generate several one-shots during a typical session, value speed over deep synthesis knowledge, and want production-ready results they can immediately drag into a project.

Thump is not initially designed for professional sound designers, mobile-first creation, realistic acoustic drum modeling, full drum kits, or complete rhythmic patterns.

## Differentiation and Moat

Thump combines two modes that are usually separated:

- Natural-language intent, which lets producers describe qualities such as dark, clipped, airy, metallic, punchy, or long-tailed.
- Stable parameter refinement, which lets users make precise changes without unintentionally replacing the sound they selected.

An optional reference provides additional guidance. In the MVP, the reference should be analyzed locally for characteristics such as fundamental pitch, duration, transient profile, brightness, and loudness envelope. It should guide a new synthesis recipe rather than promise an exact clone.

The initial moat is execution rather than proprietary AI: excellent trap-focused sound recipes, reliable prompt interpretation, a fast interaction loop, and a highly polished visual experience. Usage data and validated sound preferences could support a stronger learned system later, subject to explicit consent and privacy controls.

## Visual and Interaction Direction

Thump should feel like a premium, memorable digital instrument suitable for a public portfolio demonstration. Subtle 3D elements and audio-reactive motion may reinforce playback, generation, and parameter changes.

Visual spectacle must not obscure the primary workflow or degrade load time, frame rate, accessibility, or audio responsiveness. The exact art direction remains open. The interface should prioritize clear hierarchy, rapid auditioning, and confidence about which variation and parameter state will be exported.

## Business Model

The MVP is a free portfolio project intended for public sharing, particularly on LinkedIn. It should have no required paid inference API, GPU service, account system, or persistent application backend.

Free static hosting should be sufficient for the core experience. Any future neural generation service may introduce usage limits, credits, subscriptions, or hosted inference costs, but these are outside the MVP.

## Privacy and Rights

- Reference audio should be processed locally in the browser whenever feasible.
- Reference audio must not be retained for model training or product improvement without explicit consent.
- Temporary reference data should be discarded immediately after processing or after a short, documented expiry period. Cleanup must not depend solely on detecting browser closure.
- Product language must not guarantee an exact replica of copyrighted or commercially released audio.
- Generated output should be offered with clear terms suitable for use in the user's music. Formal commercial-use language remains to be determined before public launch.

## Risks

- **Prompt reliability:** descriptive language may map inconsistently to synthesis parameters.
- **Audio quality:** supporting four instrument types can dilute quality unless each has dedicated synthesis and evaluation logic.
- **Reference expectations:** users may expect cloning that procedural synthesis cannot provide.
- **Parameter stability:** edits may alter the selected sound too radically and undermine trust.
- **Latency:** a 15-second wait may interrupt creative flow even with polished animation.
- **Export quality:** normalization, clipping, silence, tails, sample rate, and bit depth must be handled correctly.
- **Visual performance:** 3D and audio-reactive effects may compete with audio processing or reduce usability.
- **Positioning:** calling the system AI without explaining its procedural nature may weaken credibility.

## First Experiment

Build a narrow browser prototype for the four target one-shot types. Test whether hobby beatmakers can reach a desirable result faster than they can find one in an existing sample library.

The experiment should compare:

- Text prompt only versus text prompt plus an optional reference.
- Time from intent to first acceptable sound.
- Percentage of sessions producing at least one acceptable result among three variations.
- Number of regenerations and parameter changes required before download.
- User ratings for sound quality, prompt match, control predictability, and visual polish.

A practical early success signal is that testers can create and download a sound they would genuinely use in a beat, with minimal explanation of the interface.

## Implementation Roles

### 3D Website Agent

Own the visual concept, 3D scene or object system, audio-reactive behavior, motion language, responsive composition, graceful degradation, and performance budget. Coordinate closely with the frontend agent so visual rendering never compromises audio playback or synthesis.

### Frontend Agent

Own the end-to-end user workflow, prompt interpretation, procedural synthesis engine, local reference analysis, three-variation audition experience, non-destructive parameter editing, waveform and playback UI, state management, browser compatibility, accessibility, and WAV/MP3 export.

### Backend Agent

Validate that the MVP can remain backend-free, define privacy and security boundaries, and document a future provider-neutral interface for neural generation. Do not introduce an MVP server unless a validated requirement cannot be met safely in the browser.

## Open Questions

- What final visual direction should Thump use: dark futuristic studio, gritty underground/Y2K, or another aesthetic?
- What sample rate and bit-depth options should WAV export support?
- Is MP3 export valuable enough to justify its encoder size and complexity in the MVP?
- Which prompt vocabulary and parameter ranges define a high-quality result for each instrument type?
- How should progress represent real work rather than a purely decorative timer?
- What exact retention guarantee should apply if any reference processing cannot remain local?
- What license and commercial-use terms should accompany generated sounds?
- What quantitative threshold will define a successful public launch?

## Next Steps

1. Define a small benchmark set of prompts and reference sounds for 808s, kicks, hi-hats, and snares.
2. Prototype and evaluate one sound engine at a time, beginning with 808 or kick.
3. Validate stable parameter editing before adding full visual polish.
4. Test prompt-only and reference-guided workflows with a small group of hobby beatmakers.
5. Establish export, performance, accessibility, and privacy requirements.
6. Create the visual system and 3D layer within an explicit performance budget.
7. Produce a short public demo showing prompt, generation, refinement, and DAW-ready export.

