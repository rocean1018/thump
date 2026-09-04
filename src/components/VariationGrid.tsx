import type { Variation } from '../types';
import VariationCard from './VariationCard';

interface Props {
  variations: (Variation | null)[];
  selectedIndex: number | null;
  playingId: string | null;
  onPlayToggle: (index: number, variation: Variation) => void;
  onSelect: (index: number) => void;
}

export default function VariationGrid({ variations, selectedIndex, playingId, onPlayToggle, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {variations.map((v, i) => (
        <VariationCard
          key={i}
          index={i}
          variation={v}
          isSelected={selectedIndex === i}
          isPlaying={!!v && playingId === v.recipe.id}
          onPlayToggle={() => v && onPlayToggle(i, v)}
          onSelect={() => onSelect(i)}
        />
      ))}
    </div>
  );
}
