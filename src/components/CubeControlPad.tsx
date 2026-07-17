/**
 * CubeControlPad — on-screen real-time face-turn controls (+ N/E/W/S).
 *
 * Layout: a 3x3 grid where the cardinal cells trigger face turns and the
 * corner cells trigger common rotations. Long-press / shift-click for prime.
 *
 *   [F']   [U]   [F2]
 *   [L]    [+]   [R]
 *   [B']   [D]   [B2]
 *
 * Tap = clockwise. Tap "+" toggles prime mode (sticky), and the buttons turn
 * accent-colored to indicate inverted output.
 */

import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, RotateCw } from 'lucide-react';
import { useCubeContext } from '@/cube/CubeProvider';
import { cn } from '@/lib/utils';

const Btn = ({
  label,
  onClick,
  children,
  active,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) => (
  <button
    aria-label={label}
    onClick={onClick}
    className={cn(
      'h-12 w-12 sm:h-14 sm:w-14 rounded-xl flex items-center justify-center',
      'border border-border bg-secondary text-foreground transition-all',
      'hover:bg-muted active:scale-95',
      active && 'bg-primary text-primary-foreground border-primary',
      className,
    )}
  >
    {children}
  </button>
);

export default function CubeControlPad() {
  const { enqueue, isAnimating } = useCubeContext();
  const [primeMode, setPrimeMode] = useState(false);

  const turn = (face: string) => {
    if (isAnimating) return;
    enqueue(primeMode ? `${face}'` : face);
  };

  return (
    <div className="inline-grid grid-cols-3 gap-2 p-3 rounded-2xl bg-card border border-border">
      {/* Row 1 */}
      <Btn label="F counter-clockwise" onClick={() => enqueue("F'")}>
        <span className="font-mono text-sm">F'</span>
      </Btn>
      <Btn label="Up face" onClick={() => turn('U')}>
        <ArrowUp className="w-5 h-5" />
      </Btn>
      <Btn label="F double" onClick={() => enqueue('F2')}>
        <span className="font-mono text-sm">F2</span>
      </Btn>

      {/* Row 2 */}
      <Btn label="Left face" onClick={() => turn('L')}>
        <ArrowLeft className="w-5 h-5" />
      </Btn>
      <Btn
        label="Toggle prime"
        active={primeMode}
        onClick={() => setPrimeMode((p) => !p)}
      >
        {primeMode ? <RotateCcw className="w-5 h-5" /> : <RotateCw className="w-5 h-5" />}
      </Btn>
      <Btn label="Right face" onClick={() => turn('R')}>
        <ArrowRight className="w-5 h-5" />
      </Btn>

      {/* Row 3 */}
      <Btn label="B counter-clockwise" onClick={() => enqueue("B'")}>
        <span className="font-mono text-sm">B'</span>
      </Btn>
      <Btn label="Down face" onClick={() => turn('D')}>
        <ArrowDown className="w-5 h-5" />
      </Btn>
      <Btn label="B double" onClick={() => enqueue('B2')}>
        <span className="font-mono text-sm">B2</span>
      </Btn>
    </div>
  );
}
