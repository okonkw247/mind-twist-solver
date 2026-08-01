import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Share2,
  Copy,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import CubeRenderer3D from '@/components/CubeRenderer3D';
import { useCubeContext } from '@/cube/CubeProvider';
import { CubeMove, parseSolution, getSolutionMoves } from '@/lib/kociembaSolver';
import { getInverseNotation } from '@/cube/CubeModel';

const defaultMoves: CubeMove[] = parseSolution("R U R' U' R' F R2 U' R' F'");

interface LocationState {
  solution?: CubeMove[];
  moveCount?: number;
  cubeState?: Record<string, string[]>;
  faceColors?: string[][];
}

const Solution = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const cube = useCubeContext();

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const [moves, setMoves] = useState<CubeMove[]>(
    locationState?.solution ?? (locationState?.cubeState ? [] : defaultMoves),
  );
  const [solveStatus, setSolveStatus] = useState<'idle' | 'solving' | 'ready' | 'error'>(
    locationState?.cubeState && !locationState?.solution ? 'solving' : 'ready',
  );
  const [solveError, setSolveError] = useState<string | null>(null);

  const totalMoves = moves.length;
  const progress = totalMoves ? Math.round((currentStep / totalMoves) * 100) : 0;

  useEffect(() => {
    cube.setSpeed(speed);
  }, [speed, cube]);

  // Solve the scanned state on mount and seed the 3D cube into that state.
  useEffect(() => {
    if (locationState?.solution || !locationState?.cubeState) return;
    let cancelled = false;

    (async () => {
      const result = await getSolutionMoves(locationState.cubeState!);
      if (cancelled) return;

      if (!result.success || !result.moves || result.moves.length === 0) {
        setSolveStatus('error');
        setSolveError(result.error ?? 'Could not solve the scanned cube.');
        return;
      }

      cube.reset();
      const inverseNotations = [...result.moves]
        .reverse()
        .map((m) => getInverseNotation(m.notation));
      for (const n of inverseNotations) cube.model.applyMove(n);
      cube.model.clearMoveHistory();
      cube.bumpVersion();

      setMoves(result.moves);
      setSolveStatus('ready');
      setSolveError(null);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (solveStatus !== 'ready') return;
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.25 } });
  }, [solveStatus]);

  const handleStepForward = useCallback(async () => {
    if (cube.isAnimating || currentStep >= totalMoves) return;
    await cube.executeSingle(moves[currentStep].notation);
    setCurrentStep((s) => s + 1);
    if (currentStep + 1 >= totalMoves) {
      setIsPlaying(false);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }
  }, [cube, currentStep, moves, totalMoves]);

  const handleStepBack = useCallback(async () => {
    if (cube.isAnimating || currentStep <= 0) return;
    await cube.undo();
    setCurrentStep((s) => s - 1);
  }, [cube, currentStep]);

  useEffect(() => {
    if (!isPlaying || solveStatus !== 'ready') return;
    if (currentStep >= totalMoves || cube.isAnimating) return;
    void handleStepForward();
  }, [isPlaying, currentStep, cube.isAnimating, totalMoves, handleStepForward, solveStatus]);

  const handleRestart = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    cube.reset();
    if (locationState?.cubeState && moves.length > 0) {
      const inverse = [...moves].reverse().map((m) => getInverseNotation(m.notation));
      for (const n of inverse) cube.model.applyMove(n);
      cube.model.clearMoveHistory();
      cube.bumpVersion();
    }
  }, [cube, locationState, moves]);

  const handleCopyMoves = () => {
    navigator.clipboard.writeText(moves.map((m) => m.notation).join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const moveString = moves.map((m) => m.notation).join(' ');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Cube Solution',
          text: `Solved my cube in ${totalMoves} moves!\n\n${moveString}`,
          url: window.location.origin,
        });
      } catch {
        /* cancelled */
      }
    } else {
      handleCopyMoves();
    }
  };

  const currentMove = currentStep > 0 ? moves[currentStep - 1] : null;
  const nextMove = currentStep < totalMoves ? moves[currentStep] : null;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 px-3 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/home')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold flex-1 text-center pr-9">
            Professional Solver Interface
          </h1>
        </div>
      </header>

      <main className="px-4 pt-4 max-w-2xl mx-auto">
        {/* Status banner */}
        {solveStatus === 'solving' && (
          <div className="rounded-2xl border border-border bg-card px-5 py-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="font-semibold">Solving your cube…</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Running Kociemba two-phase algorithm
            </p>
          </div>
        )}

        {solveStatus === 'error' && (
          <div className="rounded-2xl border border-destructive/50 bg-destructive/10 px-5 py-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="font-bold text-destructive">Couldn't solve scan</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{solveError}</p>
            <button onClick={() => navigate('/camera')} className="btn-secondary px-4 py-2 text-sm">
              Rescan cube
            </button>
          </div>
        )}

        {solveStatus === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-primary bg-card px-5 py-5 relative"
            style={{ boxShadow: '0 0 32px hsl(var(--primary) / 0.18)' }}
          >
            <CheckCircle2 className="w-6 h-6 text-primary absolute left-4 top-1/2 -translate-y-1/2" />
            <div className="text-center">
              <p className="text-3xl font-extrabold text-primary leading-tight">Solved!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your cube can be solved in{' '}
                <span className="text-foreground font-semibold">{totalMoves} moves</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* Move strip */}
        {moves.length > 0 && (
          <div className="mt-5 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max pb-1">
              {moves.map((move, index) => (
                <div
                  key={index}
                  className={`w-12 h-14 shrink-0 rounded-xl flex items-center justify-center font-bold text-xl border transition-all ${
                    index === currentStep
                      ? 'bg-primary text-primary-foreground border-primary'
                      : index < currentStep
                      ? 'bg-primary/15 text-primary border-primary/40'
                      : 'bg-card text-foreground border-primary/25'
                  }`}
                >
                  {move.notation}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cube stage */}
        <div className="relative mt-6 mb-4 flex items-center justify-center">
          <div
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
            style={{
              background:
                'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.55), transparent)',
            }}
          />
          <CubeRenderer3D size="min(78vw, 320px)" interactive enableInputs={false} />
        </div>

        {/* Current move readout */}
        <div className="text-center mb-5 min-h-[52px]">
          {currentStep === 0 ? (
            <p className="text-muted-foreground text-sm">Press play to start solving</p>
          ) : currentStep >= totalMoves ? (
            <div className="flex items-center justify-center gap-2 text-primary font-bold">
              <Check className="w-5 h-5" /> Cube Solved!
            </div>
          ) : (
            <>
              <div className="text-3xl font-mono font-bold text-primary">
                {currentMove?.notation}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentMove?.description}
                {nextMove && ` · Next: ${nextMove.notation}`}
              </p>
            </>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between text-sm font-medium mb-2">
          <span>
            Step {currentStep} of {totalMoves}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-primary/25 mb-8">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary transition-all"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-between px-2 mb-8">
          <button
            onClick={handleRestart}
            className="p-3 text-foreground hover:text-primary transition-colors"
            aria-label="Restart"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
          <button
            onClick={handleStepBack}
            disabled={currentStep === 0}
            className="p-3 text-foreground hover:text-primary disabled:opacity-30 transition-colors"
            aria-label="Step back"
          >
            <Rewind className="w-7 h-7 fill-current" />
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            disabled={solveStatus !== 'ready' || totalMoves === 0}
            className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
            style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.35)' }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-9 h-9 fill-current" />
            ) : (
              <Play className="w-9 h-9 fill-current ml-1" />
            )}
          </button>
          <button
            onClick={handleStepForward}
            disabled={currentStep >= totalMoves}
            className="p-3 text-foreground hover:text-primary disabled:opacity-30 transition-colors"
            aria-label="Step forward"
          >
            <FastForward className="w-7 h-7 fill-current" />
          </button>
          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className="p-3 text-foreground hover:text-primary transition-colors"
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-2 justify-center mb-8">
          {(['slow', 'normal', 'fast'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize border transition-colors ${
                speed === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/home')}
            className="btn-primary w-full h-14 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Solve Another Cube
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="btn-secondary flex-1 h-12 flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
            <button
              onClick={handleCopyMoves}
              className="btn-secondary flex-1 h-12 flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Solution;
