import type { GenerationStage, Variation } from '../types';

interface Props {
  stage: GenerationStage;
  variations: (Variation | null)[];
}

const STEPS: { key: GenerationStage; label: string }[] = [
  { key: 'parsing-prompt', label: 'Reading prompt' },
  { key: 'synthesizing', label: 'Synthesizing' },
  { key: 'ready', label: 'Ready' },
];

function stageIndex(stage: GenerationStage): number {
  const idx = STEPS.findIndex((s) => s.key === stage);
  return idx === -1 ? 0 : idx;
}

/** Reflects real progress: prompt parsed, then each variation lighting up as it finishes rendering. */
export default function ProgressIndicator({ stage, variations }: Props) {
  if (stage === 'idle') return null;
  const done = variations.filter(Boolean).length;
  const current = stageIndex(stage);

  return (
    <div className="animate-rise" role="status" aria-live="polite">
      <div className="flex items-center gap-2 mb-2">
        {STEPS.map((step, i) => (
          <div
            key={step.key}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < current || stage === 'ready' ? 'bg-ember' : i === current ? 'bg-ember/50 animate-pulseSlow' : 'bg-line'
            }`}
          />
        ))}
      </div>
      <p className="text-xs font-mono text-white/45">
        {stage === 'parsing-prompt' && 'Reading prompt & reference…'}
        {stage === 'synthesizing' && `Synthesizing variations… ${done}/3 ready`}
        {stage === 'ready' && 'Three variations ready — audition and pick one.'}
        {stage === 'error' && 'Generation hit a snag.'}
      </p>
    </div>
  );
}
