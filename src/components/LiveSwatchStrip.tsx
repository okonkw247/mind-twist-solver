/**
 * LiveSwatchStrip — Renders a 3x3 grid of swatches showing the currently
 * detected colors. Driven by the parent's throttled `classifyFace` loop.
 */
import type { ColorName } from '@/lib/colorClassifier';

const COLOR_MAP: Record<ColorName, string> = {
  white: '#F8F8F8',
  yellow: '#FFD500',
  red: '#C41E3A',
  orange: '#FF5800',
  blue: '#0051BA',
  green: '#009E60',
};

export default function LiveSwatchStrip({
  colors,
  readable = false,
}: { colors: ColorName[] | null; readable?: boolean }) {
  return (
    <div
      className={`grid grid-cols-3 gap-1 w-32 h-32 rounded-lg p-1 border-2 transition-colors ${
        readable ? 'border-primary bg-primary/10' : 'border-border bg-card/70'
      }`}
      aria-label={readable ? 'Live colors ready to capture' : 'Reading cube colors'}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const c = colors?.[i];
        return (
          <div
            key={i}
            className="rounded-sm border border-black/40"
            style={{
              background: c ? COLOR_MAP[c] : 'hsl(var(--muted))',
              opacity: c ? 1 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
}
