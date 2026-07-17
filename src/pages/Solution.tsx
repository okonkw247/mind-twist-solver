import { useState, Suspense, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2, Copy, RotateCcw, Check, Sparkles, GraduationCap, Zap, AlertTriangle } from 'lucide-react';
import CubeRenderer3D from '@/components/CubeRenderer3D';
import { useCubeContext } from '@/cube/CubeProvider';
import SolveControls from '@/components/SolveControls';
import confetti from 'canvas-confetti';
import { CubeMove, parseSolution, getSolutionMoves } from '@/lib/kociembaSolver';
import { getInverseNotation } from '@/cube/CubeModel';

// Fallback demo moves if no scan/state was passed
const defaultMoves: CubeMove[] = parseSolution("R U R' U' R' F R2 U' R' F'");

interface LocationState {
  solution?: CubeMove[];
  moveCount?: number;
  cubeState?: Record<string, string[]>;
  faceColors?: string[][];
}

const faceHighlightColors: Record<string, string> = {
  R: 'shadow-[0_0_30px_hsl(var(--primary)/0.6)]',
  L: 'shadow-[0_0_30px_hsl(var(--primary)/0.6)]',
  U: 'shadow-[0_0_30px_hsl(var(--primary)/0.6)]',
  D: 'shadow-[0_0_30px_hsl(var(--primary)/0.6)]',
  F: 'shadow-[0_0_30px_hsl(var(--primary)/0.6)]',
  B: 'shadow-[0_0_30px_hsl(var(--primary)/0.6)]',
};

const Solution = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const cube = useCubeContext();

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [copied, setCopied] = useState(false);
  const [learningMode, setLearningMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const [moves, setMoves] = useState<CubeMove[]>(
    locationState?.solution ?? (locationState?.cubeState ? [] : defaultMoves)
  );
  const [solveStatus, setSolveStatus] = useState<'idle' | 'solving' | 'ready' | 'error'>(
    locationState?.cubeState && !locationState?.solution ? 'solving' : 'ready'
  );
  const [solveError, setSolveError] = useState<string | null>(null);

  const totalMoves = moves.length;

  // Map UI speed → CubeProvider preset
  useEffect(() => {
    cube.setSpeed(speed === 'slow' ? 'slow' : speed === 'fast' ? 'fast' : 'normal');
  }, [speed, cube]);

  // Solve the scanned state on mount and seed the 3D cube into that state.
  // Strategy: Kociemba returns a forward solution S that takes scrambled → solved.
  // To put the model INTO the scrambled state from solved, apply S in reverse, inverted.
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

      // Seed 3D cube into the scanned state without animating each move
      cube.reset();
      const prevSpeed = cube.getSpeed();
      cube.setSpeed('fast');
      // Apply directly to logical model (skip animation queue) so render shows scrambled instantly
      const inverseNotations = [...result.moves]
        .reverse()
        .map((m) => getInverseNotation(m.notation));
      for (const n of inverseNotations) {
        cube.model.applyMove(n);
      }
      // Reset move history so user-driven step counters stay clean
      (cube.model as unknown as { _moveHistory: string[] })._moveHistory = [];
      cube.setSpeed(prevSpeed);
      cube.bumpVersion();

      setMoves(result.moves);
      setSolveStatus('ready');
      setSolveError(null);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Confetti only when solver is ready (avoid celebrating an error state)
  useEffect(() => {
    if (solveStatus !== 'ready') return;
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.3 } });
  }, [solveStatus]);

  // Step forward — execute via the shared AnimationController
  const handleStepForward = useCallback(async () => {
    if (cube.isAnimating || currentStep >= totalMoves) return;
    const move = moves[currentStep];
    await cube.executeSingle(move.notation);
    setCurrentStep((s) => s + 1);
    if (currentStep + 1 >= totalMoves) {
      setIsPlaying(false);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }
  }, [cube, currentStep, moves, totalMoves]);

  // Step back — undo via the shared AnimationController
  const handleStepBack = useCallback(async () => {
    if (cube.isAnimating || currentStep <= 0) return;
    await cube.undo();
    setCurrentStep((s) => s - 1);
  }, [cube, currentStep]);

  // Auto-play
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
      const inverseNotations = [...moves].reverse().map((m) => getInverseNotation(m.notation));
      for (const n of inverseNotations) {
        cube.model.applyMove(n);
      }
      (cube.model as unknown as { _moveHistory: string[] })._moveHistory = [];
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
          title: 'My Cube Solution - JSN Solving',
          text: `I solved my Rubik's Cube in ${totalMoves} moves!\n\nSolution: ${moveString}`,
          url: window.location.origin,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopyMoves();
    }
  };

  const currentMove = currentStep > 0 ? moves[currentStep - 1] : null;
  const nextMove = currentStep < totalMoves ? moves[currentStep] : null;
  const highlightClass = nextMove ? faceHighlightColors[nextMove.face] || '' : '';

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 gradient-main">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/home')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-primary-foreground flex-1">Solution</h1>

          <button
            onClick={() => setLearningMode(!learningMode)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              learningMode
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-accent/20 text-accent-foreground border border-accent/30'
            }`}
          >
            {learningMode ? (
              <>
                <GraduationCap className="w-4 h-4" />
                Learn
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Pro
              </>
            )}
          </button>
        </div>
      </header>

      <main className="pt-16 pb-8 px-4">
        {solveStatus === 'solving' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary/60 border border-border rounded-2xl p-4 mb-4 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="font-semibold">Solving your cube…</span>
            </div>
            <p className="text-sm text-muted-foreground">Running Kociemba two-phase algorithm</p>
          </motion.div>
        )}

        {solveStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/40 rounded-2xl p-4 mb-4 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="font-bold text-destructive">Couldn't solve scan</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{solveError}</p>
            <button onClick={() => navigate('/camera')} className="btn-secondary px-4 py-2 text-sm">
              Rescan cube
            </button>
          </motion.div>
        )}

        {solveStatus === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-4 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Check className="w-5 h-5 text-primary" />
              <span className="font-bold text-primary">Solved!</span>
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your cube can be solved in <span className="font-semibold text-foreground">{totalMoves} moves</span>
            </p>
          </motion.div>
        )}

        {moves.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="flex flex-wrap gap-1.5 justify-center">
              {moves.map((move, index) => (
                <button
                  key={index}
                  disabled
                  className={`px-2 py-1 rounded font-mono text-sm transition-all ${
                    index === currentStep
                      ? 'bg-primary text-primary-foreground scale-110 ring-2 ring-primary/50'
                      : index < currentStep
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {move.notation}
                </button>
              ))}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex justify-center mb-4 rounded-3xl transition-shadow duration-300 ${highlightClass}`}
        >
          <Suspense
            fallback={
              <div className="w-[260px] h-[260px] flex items-center justify-center bg-secondary/20 rounded-2xl">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            }
          >
            <CubeRenderer3D size={260} />
          </Suspense>
        </motion.div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card text-center mb-4"
        >
          {currentStep === 0 ? (
            <p className="text-muted-foreground">Press play to start solving</p>
          ) : currentStep >= totalMoves ? (
            <div className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              <p className="font-bold text-primary">Cube Solved!</p>
            </div>
          ) : (
            <>
              <div className="text-4xl font-mono font-bold mb-2 gradient-text">
                {currentMove?.notation}
              </div>
              {learningMode && (
                <p className="text-sm text-muted-foreground">{currentMove?.description}</p>
              )}
              {nextMove && learningMode && (
                <p className="text-xs text-muted-foreground mt-2">
                  Next: <span className="font-mono">{nextMove.notation}</span>
                </p>
              )}
            </>
          )}
        </motion.div>

        <div className="mb-6">
          <SolveControls
            isPlaying={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onStepForward={handleStepForward}
            onStepBack={handleStepBack}
            onRestart={handleRestart}
            currentStep={currentStep}
            totalSteps={totalMoves}
            speed={speed}
            onSpeedChange={setSpeed}
            soundEnabled={soundEnabled}
            onSoundToggle={() => setSoundEnabled(!soundEnabled)}
            learningMode={learningMode}
          />
        </div>

        <div className="space-y-3 max-w-md mx-auto">
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
