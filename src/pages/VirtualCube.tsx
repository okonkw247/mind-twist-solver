/**
 * VirtualCube — Bold, hand-rotatable cube workspace.
 *
 * Drag = orbit camera (via OrbitControls in CubeRenderer3D).
 * Scramble / Solve / Reset buttons drive the move queue.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Play, Square } from 'lucide-react';
import CubeRenderer3D, { type CubeRenderer3DHandle } from '@/components/CubeRenderer3D';
import CameraControls from '@/components/CameraControls';
import AdvancedSolverModal from '@/components/AdvancedSolverModal';
import { useCubeContext } from '@/cube/CubeProvider';
import { generateScramble, parseSolution } from '@/lib/kociembaSolver';

const VirtualCube = () => {
  const navigate = useNavigate();
  const cube = useCubeContext();
  const cubeRendererRef = useRef<CubeRenderer3DHandle>(null);
  const [solverOpen, setSolverOpen] = useState(false);

  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);
  const timerStartRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    if (timerRunning) return;
    timerStartRef.current = Date.now() - elapsedMs;
    timerIntervalRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - timerStartRef.current);
    }, 10);
    setTimerRunning(true);
  }, [timerRunning, elapsedMs]);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimerRunning(false);
    setElapsedMs(0);
  }, []);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current !== null) window.clearInterval(timerIntervalRef.current);
    };
  }, []);

  const formatTime = (ms: number) => {
    const totalCentis = Math.floor(ms / 10);
    const minutes = Math.floor(totalCentis / 6000);
    const seconds = Math.floor((totalCentis % 6000) / 100);
    const centis = totalCentis % 100;
    return `${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')} : ${String(centis).padStart(2, '0')}`;
  };

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
        {/* Gesture hint */}
        <p className="text-center text-xs text-muted-foreground px-4 pb-2">
          Swipe with one finger to turn a face · two fingers (or right-drag) to rotate the cube
        </p>

        {/* Cube canvas — fills the stage, hand-controlled */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse at center, hsl(var(--secondary) / 0.25), transparent 70%)',
          }}
        >
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            }
          >
            <div className="absolute top-3 right-3 z-10">
              <CameraControls
                compact
                onZoomIn={() => cubeRendererRef.current?.zoomIn()}
                onZoomOut={() => cubeRendererRef.current?.zoomOut()}
                onReset={() => cubeRendererRef.current?.resetView()}
                onViewFront={() => cubeRendererRef.current?.viewFront()}
                onViewTop={() => cubeRendererRef.current?.viewTop()}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <CubeRenderer3D
                ref={cubeRendererRef}
                size="100%"
                interactive
                enableInputs
                gestureMode="turn-primary"
                autoRotateIdle={false}
              />
            </div>
          </Suspense>
        </div>

        {/* Mini timer strip */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border">
          <button onClick={startTimer} disabled={timerRunning || cube.isSolved()} className="btn-icon disabled:opacity-40" aria-label="Start timer">
            <Play className="w-6 h-6 text-muted-foreground" />
          </button>
          <span className="font-mono text-2xl tracking-wider text-muted-foreground tabular-nums">
            {formatTime(elapsedMs)}
          </span>
          <button onClick={stopTimer} disabled={!timerRunning} className="btn-icon disabled:opacity-40" aria-label="Stop timer">
            <Square className="w-6 h-6 text-muted-foreground" />
          </button>
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
