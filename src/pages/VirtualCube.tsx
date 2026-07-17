/**
 * VirtualCube — Bold, hand-rotatable cube workspace.
 *
 * Drag = orbit camera (via OrbitControls in CubeRenderer3D).
 * Scramble / Solve / Reset buttons drive the move queue.
 */
import { Suspense, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Play, Square } from 'lucide-react';
import CubeRenderer3D from '@/components/CubeRenderer3D';
import AdvancedSolverModal from '@/components/AdvancedSolverModal';
import { useCubeContext } from '@/cube/CubeProvider';
import { generateScramble, parseSolution } from '@/lib/kociembaSolver';

const VirtualCube = () => {
  const navigate = useNavigate();
  const cube = useCubeContext();
  const [solverOpen, setSolverOpen] = useState(false);

  const handleScramble = useCallback(async () => {
    if (cube.isAnimating) return;
    const scramble = generateScramble(22);
    const moves = parseSolution(scramble).map((m) => m.notation);
    cube.enqueue(moves);
  }, [cube]);

  const handleReset = useCallback(() => {
    cube.reset();
  }, [cube]);

  const handleApplySolution = useCallback(
    (moves: string[]) => {
      cube.enqueue(moves);
    },
    [cube],
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button onClick={() => navigate(-1)} className="btn-icon" aria-label="Back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-wide">Virtual Cube</h1>
        <button className="btn-icon" aria-label="Menu">
          <MoreVertical className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Cube canvas — drag to orbit */}
        <div
          className="flex-1 flex items-center justify-center relative"
          style={{
            background:
              'radial-gradient(ellipse at center, hsl(var(--secondary) / 0.25), transparent 70%)',
          }}
        >
          <Suspense
            fallback={
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            }
          >
            <CubeRenderer3D size={320} interactive enableInputs={false} autoRotateIdle={false} />
          </Suspense>
        </div>

        {/* Mini timer strip */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border">
          <Play className="w-6 h-6 text-muted-foreground" />
          <span className="font-mono text-2xl tracking-wider text-muted-foreground tabular-nums">
            00 : 00 : 00
          </span>
          <Square className="w-6 h-6 text-muted-foreground" />
        </div>

        {/* Action row */}
        <div className="grid grid-cols-3 gap-3 px-4 py-4 safe-bottom">
          <button
            onClick={handleScramble}
            disabled={cube.isAnimating}
            className="py-4 rounded-xl border border-border bg-card font-semibold disabled:opacity-50 hover:bg-secondary/40 transition-colors"
          >
            Scramble
          </button>
          <button
            onClick={() => setSolverOpen(true)}
            disabled={cube.isAnimating}
            className="py-4 rounded-xl border border-border bg-card font-semibold disabled:opacity-50 hover:bg-secondary/40 transition-colors"
          >
            Solve
          </button>
          <button
            onClick={handleReset}
            className="py-4 rounded-xl border border-border bg-card font-semibold hover:bg-secondary/40 transition-colors"
          >
            Reset
          </button>
        </div>
      </main>

      <AdvancedSolverModal
        open={solverOpen}
        onClose={() => setSolverOpen(false)}
        faceArrays={cube.getFaceArrays()}
        onApply={handleApplySolution}
        onEditColors={() => navigate('/manual-input')}
      />
    </div>
  );
};

export default VirtualCube;
