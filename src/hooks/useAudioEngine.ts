import { useCallback, useEffect, useRef, useState } from 'react';
import type { CreativeParams, GenerationStage, Instrument, ReferenceAnalysis, Variation } from '../types';
import { interpretPrompt } from '../audio/promptParser';
import { analyzeReference, decodeReferenceFile } from '../audio/referenceAnalysis';
import { generateVariations, refineRecipe } from '../audio/variationEngine';
import { renderRecipe } from '../audio/synthesis';
import { newSeed } from '../audio/rng';

export function useAudioEngine() {
  const [instrument, setInstrument] = useState<Instrument>('808');
  const [prompt, setPrompt] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [referenceAnalysis, setReferenceAnalysis] = useState<ReferenceAnalysis | null>(null);
  const [referenceStatus, setReferenceStatus] = useState<'idle' | 'analyzing' | 'ready' | 'error'>('idle');
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [variations, setVariations] = useState<(Variation | null)[]>([null, null, null]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [refineParams, setRefineParams] = useState<CreativeParams | null>(null);
  const [refinedBuffer, setRefinedBuffer] = useState<AudioBuffer | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const epoch = useRef(0), refineEpoch = useRef(0), referenceEpoch = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const selectedRef = useRef<number | null>(null);
  const variationsRef = useRef(variations);
  variationsRef.current = variations;
  const invalidateRefinement = useCallback(() => { ++refineEpoch.current; clearTimeout(timer.current); setIsRefining(false); }, []);

  const handleReferenceFile = useCallback(async (file: File | null) => {
    const token = ++referenceEpoch.current;
    setReferenceAnalysis(null); setReferenceError(null);
    if (!file) { setReferenceStatus('idle'); return; }
    setReferenceStatus('analyzing');
    try {
      const buffer = await decodeReferenceFile(file);
      if (referenceEpoch.current !== token) return;
      const analysis = analyzeReference(buffer, file.name);
      setReferenceAnalysis(analysis); setReferenceStatus('ready');
    } catch (e) {
      if (referenceEpoch.current !== token) return;
      setReferenceStatus('error');
      setReferenceError(e instanceof Error ? e.message : 'Could not read this audio file.');
    }
  }, []);

  const generate = useCallback(async () => {
    const token = ++epoch.current;
    invalidateRefinement(); selectedRef.current = null;
    setSelectedIndex(null); setRefineParams(null); setRefinedBuffer(null);
    setVariations([null, null, null]); setGeneratedPrompt(prompt); setError(null); setStage('parsing-prompt');
    try {
      // Yield to paint real progress; don't add a fake multi-second waiting period.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const interpretation = prompt.trim() ? interpretPrompt(prompt) : null;
      const recipes = generateVariations(instrument, interpretation, referenceAnalysis, newSeed());
      if (token !== epoch.current) return;
      setStage('synthesizing');
      const settled = await Promise.allSettled(recipes.map(async (recipe, i) => {
        const buffer = await renderRecipe(recipe);
        if (token !== epoch.current) return;
        setVariations(prev => { const next = [...prev]; next[i] = { recipe, buffer }; return next; });
      }));
      if (token !== epoch.current) return;
      const failures = settled.filter(r => r.status === 'rejected').length;
      if (failures) setError(failures === 3 ? 'Could not generate audio. Please try again in a browser with Web Audio support.' : 'Some variations failed. You can audition the finished sounds or generate again.');
      setStage(failures === 3 ? 'error' : 'ready');
    } catch {
      if (token === epoch.current) { setStage('error'); setError('Could not generate these sounds. Please try again.'); }
    }
  }, [instrument, prompt, referenceAnalysis, invalidateRefinement]);

  const selectVariation = useCallback((index: number) => {
    const v = variationsRef.current[index]; if (!v) return;
    invalidateRefinement(); selectedRef.current = index;
    setSelectedIndex(index); setRefineParams(v.recipe.params); setRefinedBuffer(v.buffer); setError(null);
  }, [invalidateRefinement]);

  const updateRefineParam = useCallback((key: keyof CreativeParams, value: number) => {
    ++refineEpoch.current; clearTimeout(timer.current);
    setIsRefining(true); setError(null);
    setRefineParams(prev => prev ? { ...prev, [key]: value } : prev);
  }, []);

  useEffect(() => {
    if (selectedIndex === null || !refineParams) return;
    const selected = variationsRef.current[selectedIndex]; if (!selected) return;
    if (Object.keys(refineParams).every(k => refineParams[k as keyof CreativeParams] === selected.recipe.params[k as keyof CreativeParams])) {
      setIsRefining(false); return;
    }
    const token = ++refineEpoch.current, generation = epoch.current;
    setIsRefining(true);
    timer.current = setTimeout(async () => {
      try {
        const recipe = refineRecipe(selected.recipe, refineParams);
        const buffer = await renderRecipe(recipe);
        if (token !== refineEpoch.current || generation !== epoch.current || selectedRef.current !== selectedIndex) return;
        setRefinedBuffer(buffer);
        setVariations(prev => {
          if (prev[selectedIndex]?.recipe.id !== selected.recipe.id) return prev;
          const next = [...prev]; next[selectedIndex] = { recipe, buffer }; return next;
        });
      } catch {
        if (token === refineEpoch.current) { setError('That edit could not render. Adjust a control to retry.'); setRefinedBuffer(null); }
      } finally { if (token === refineEpoch.current) setIsRefining(false); }
    }, 80);
    return () => { clearTimeout(timer.current); ++refineEpoch.current; };
  }, [refineParams, selectedIndex]);

  const resetAll = useCallback(() => {
    ++epoch.current; invalidateRefinement(); selectedRef.current = null;
    setStage('idle'); setVariations([null, null, null]); setSelectedIndex(null);
    setRefineParams(null); setRefinedBuffer(null); setError(null);
  }, [invalidateRefinement]);
  useEffect(() => () => { ++epoch.current; ++refineEpoch.current; ++referenceEpoch.current; clearTimeout(timer.current); }, []);
  return { instrument, setInstrument, prompt, setPrompt, generatedPrompt, referenceAnalysis, referenceStatus,
    referenceError, handleReferenceFile, clearReference: () => handleReferenceFile(null), stage, variations,
    selectedIndex, selectVariation, refineParams, updateRefineParam, refinedBuffer, isRefining, error,
    generate, regenerate: generate, resetAll };
}
export type AudioEngine = ReturnType<typeof useAudioEngine>;
