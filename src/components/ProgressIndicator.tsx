import type { GenerationStage, Variation } from '../types';

interface Props {
  stage: GenerationStage;
  variations: (Variation | null)[];
}

const SEGMENTS = 16;

function litCount(stage: GenerationStage, done: number): number {
  if (stage === 'parsing-prompt') return 2;
  if (stage === 'synthesizing') return 4 + done * 4;
  if (stage === 'ready') return SEGMENTS;
  return 0;
}

/** LED-meter style progress — segments light up as prompt parsing and each variation finish rendering. */
export default function ProgressIndicator({ stage, variations }: Props) {
  if (stage === 'idle') return null;
  const done = variations.filter(Boolean).length;
  const lit = litCount(stage, done);

  return (
    <div className="animate-rise" role="status" aria-live="polite">
      <div className="flex gap-[3px] mb-2">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const on = i < lit;
          const hot = i >= SEGMENTS - 3;
          return (
            <span
              key={i}
              className={`h-2 flex-1 rounded-[1px] transition-colors duration-150 ${
                on ? (hot ? 'bg-acid shadow-acid' : 'bg-ember') : 'bg-line'
              }`}
            />
          );
        })}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
        {stage === 'parsing-prompt' && 'reading prompt & reference…'}
        {stage === 'synthesizing' && `synthesizing — ${done}/3 rendered`}
        {stage === 'ready' && 'ready — audition and pick one'}
        {stage === 'error' && 'generation hit a snag'}
      </p>
    </div>
  );
}
