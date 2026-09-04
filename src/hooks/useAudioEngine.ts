import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CreativeParams,
  GenerationStage,
  Instrument,
  ReferenceAnalysis,
  SoundRecipe,
  Variation,
} from '../types';
import { interpretPrompt } from '../audio/promptParser';
import { analyzeReference, decodeReferenceFile } from '../audio/referenceAnalysis';
import { generateVariations, refineRecipe } from '../audio/variationEngine';
import { renderRecipe } from '../audio/synthesis';
import { newSeed } from '../audio/rng';

const REFINE_DEBOUNCE_MS = 90;

export interface AudioEngineState {
  instrument: Instrument;
  prompt: string;
  referenceAnalysis: ReferenceAnalysis | null;
  referenceStatus: 'idle' | 'analyzing' | 'ready' | 'error';
  referenceError: string | null;
  stage: GenerationStage;
  variations: (Variation | null)[];
  selectedIndex: number | null;
  refineParams: CreativeParams | null;
  refinedBuffer: AudioBuffer | null;
  isRefining: boolean;
  error: string | null;
}

const INITIAL_VARIATIONS: (Variation | null)[] = [null, null, null];

export function useAudioEngine() {
  const [instrument, setInstrument] = useState<Instrument>('808');
  const [prompt, setPrompt] = useState('');
  const [referenceAnalysis, setReferenceAnalysis] = useState<ReferenceAnalysis | null>(null);
  const [referenceStatus, setReferenceStatus] = useState<AudioEngineState['referenceStatus']>('idle');
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [variations, setVariations] = useState<(Variation | null)[]>(INITIAL_VARIATIONS);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [refineParams, setRefineParams] = useState<CreativeParams | null>(null);
  const [refinedBuffer, setRefinedBuffer] = useState<AudioBuffer | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regenSeedRef = useRef<number>(newSeed());
  const generationTokenRef = useRef(0);
  const refineTokenRef = useRef(0);
  const refineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReferenceFile = useCallback(async (file: File | null) => {
    if (!file) {
      setReferenceAnalysis(null);
      setReferenceStatus('idle');
      setReferenceError(null);
      return;
    }
    setReferenceStatus('analyzing');
    setReferenceError(null);
    try {
      // Decoded buffer + raw file bytes live only for the duration of this
      // function call — only the small numeric ReferenceAnalysis is retained.
      const buffer = await decodeReferenceFile(file);
      const analysis = analyzeReference(buffer, file.name);
      setReferenceAnalysis(analysis);
      setReferenceStatus('ready');
    } catch (e) {
      setReferenceAnalysis(null);
      setReferenceStatus('error');
      setReferenceError('Could not read that audio file. Try a WAV or MP3 under 10MB.');
    }
  }, []);

  const clearReference = useCallback(() => {
    setReferenceAnalysis(null);
    setReferenceStatus('idle');
    setReferenceError(null);
  }, []);

  const runGeneration = useCallback(
    async (seed: number) => {
      const token = ++generationTokenRef.current;
      setError(null);
      setSelectedIndex(null);
      setRefineParams(null);
      setRefinedBuffer(null);
      setVariations(INITIAL_VARIATIONS);
      setStage('parsing-prompt');

      try {
        const interpretation = prompt.trim().length > 0 ? interpretPrompt(prompt) : null;
        if (generationTokenRef.current !== token) return;

        setStage('synthesizing');
        const recipes: SoundRecipe[] = generateVariations(instrument, interpretation, referenceAnalysis, seed);

        const results = await Promise.allSettled(
          recipes.map(async (recipe, i) => {
            const buffer = await renderRecipe(recipe);
            if (generationTokenRef.current !== token) return;
            setVariations((prev) => {
              const next = [...prev];
              next[i] = { recipe, buffer };
              return next;
            });
          })
        );

        if (generationTokenRef.current !== token) return;

        const allFailed = results.every((r) => r.status === 'rejected');
        if (allFailed) {
          setError('Generation failed. Your browser may not support the Web Audio features Thump needs.');
          setStage('error');
          return;
        }
        setStage('ready');
      } catch (e) {
        if (generationTokenRef.current !== token) return;
        setError('Something went wrong generating variations. Please try again.');
        setStage('error');
      }
    },
    [instrument, prompt, referenceAnalysis]
  );

  const generate = useCallback(() => {
    regenSeedRef.current = newSeed();
    void runGeneration(regenSeedRef.current);
  }, [runGeneration]);

  const regenerate = useCallback(() => {
    regenSeedRef.current = newSeed();
    void runGeneration(regenSeedRef.current);
  }, [runGeneration]);

  const selectVariation = useCallback(
    (index: number) => {
      const v = variations[index];
      if (!v) return;
      setSelectedIndex(index);
      setRefineParams(v.recipe.params);
      setRefinedBuffer(v.buffer);
    },
    [variations]
  );

  const updateRefineParam = useCallback((key: keyof CreativeParams, value: number) => {
    setRefineParams((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  // Debounced re-render on refine param changes — identity (seed, base pitch) never moves.
  useEffect(() => {
    if (selectedIndex === null || !refineParams) return;
    const selected = variations[selectedIndex];
    if (!selected) return;

    if (refineTimerRef.current) clearTimeout(refineTimerRef.current);
    setIsRefining(true);
    const token = ++refineTokenRef.current;

    refineTimerRef.current = setTimeout(async () => {
      try {
        const recipe = refineRecipe(selected.recipe, refineParams);
        const buffer = await renderRecipe(recipe);
        if (refineTokenRef.current !== token) return;
        setRefinedBuffer(buffer);
        setVariations((prev) => {
          const next = [...prev];
          next[selectedIndex] = { recipe, buffer };
          return next;
        });
      } finally {
        if (refineTokenRef.current === token) setIsRefining(false);
      }
    }, REFINE_DEBOUNCE_MS);

    return () => {
      if (refineTimerRef.current) clearTimeout(refineTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refineParams, selectedIndex]);

  const resetAll = useCallback(() => {
    generationTokenRef.current++;
    setStage('idle');
    setVariations(INITIAL_VARIATIONS);
    setSelectedIndex(null);
    setRefineParams(null);
    setRefinedBuffer(null);
    setError(null);
  }, []);

  return {
    instrument,
    setInstrument,
    prompt,
    setPrompt,
    referenceAnalysis,
    referenceStatus,
    referenceError,
    handleReferenceFile,
    clearReference,
    stage,
    variations,
    selectedIndex,
    selectVariation,
    refineParams,
    updateRefineParam,
    refinedBuffer,
    isRefining,
    error,
    generate,
    regenerate,
    resetAll,
  };
}

export type AudioEngine = ReturnType<typeof useAudioEngine>;
