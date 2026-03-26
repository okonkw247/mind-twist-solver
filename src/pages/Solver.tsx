import { useState, Suspense, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pause, Settings, Shuffle, Lightbulb, Play, RotateCcw,
  ChevronLeft, ChevronRight, Copy, Check
} from 'lucide-react';
import CubeRenderer3D from '@/components/CubeRenderer3D';
import { useCubeContext } from '@/cube/CubeProvider';
import BottomNav from '@/components/BottomNav';
import StatCard from '@/components/StatCard';
import confetti from 'canvas-confetti';
import { generateScramble, getSolutionMoves, parseSolution } from '@/lib/kociembaSolver';

const Solver = () => {
  const navigate = useNavigate();
  const cube = useCubeContext();

  // Timer state
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [hints, setHints] = useState(3);

  // Solution state
  const [solution, setSolution] = useState<string[]>([]);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setTime(prev => prev + 10), 10);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centiseconds.toString().padStart(2, '0')}`;
  };

  const handleShuffle = useCallback(async () => {
    if (cube.isAnimating || isScrambling) return;

    setIsScrambling(true);
    setMoveCount(0);
    setTime(0);
    setIsRunning(false);
    setSolution([]);
    setSolutionIndex(0);

    cube.reset();
    cube.setSpeed('fast');

    const scramble = generateScramble(15);
    const moves = parseSolution(scramble);

    for (const move of moves) {
      await cube.executeSingle(move.notation);
    }

    cube.setSpeed('normal');
    setIsScrambling(false);
    setIsRunning(true);
  }, [cube, isScrambling]);

  const handleHint = useCallback(async () => {
    if (hints <= 0 || cube.isAnimating) return;

    setHints(prev => prev - 1);

    const state = cube.getFaceArrays();
    const result = await getSolutionMoves(state);

    if (result.success && result.moves && result.moves.length > 0) {
      const moveNotations = result.moves.map(m => m.notation);
      setSolution(moveNotations);
      setSolutionIndex(0);

      await cube.executeSingle(moveNotations[0]);
      setMoveCount(prev => prev + 1);
      setSolutionIndex(1);
    }
  }, [hints, cube]);

  const handlePauseResume = () => setIsRunning(prev => !prev);

  const handleReset = () => {
    cube.reset();
    setMoveCount(0);
    setTime(0);
    setIsRunning(false);
    setSolution([]);
    setSolutionIndex(0);
    setHints(3);
  };

  const handleStepForward = useCallback(async () => {
    if (cube.isAnimating || solutionIndex >= solution.length) return;

    await cube.executeSingle(solution[solutionIndex]);
    setMoveCount(prev => prev + 1);
    setSolutionIndex(prev => prev + 1);

    if (solutionIndex >= solution.length - 1) {
      setIsRunning(false);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }
  }, [cube, solution, solutionIndex]);

  const handleStepBack = useCallback(async () => {
    if (cube.isAnimating || solutionIndex <= 0) return;

    await cube.undo();
    setMoveCount(prev => Math.max(0, prev - 1));
    setSolutionIndex(prev => prev - 1);
  }, [cube, solutionIndex]);

  const handleCopy = () => {
    navigator.clipboard.writeText(solution.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button onClick={handlePauseResume} className="btn-icon" aria-label={isRunning ? 'Pause' : 'Resume'}>
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        <h1 className="text-xl font-bold tracking-wider">3X3 SOLVER</h1>
        <button onClick={() => navigate('/premium')} className="btn-icon" aria-label="Settings">
          <Settings className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 px-4 flex flex-col">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <StatCard label="MOVES" value={moveCount} />
          <StatCard label="TIME" value={formatTime(time)} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex items-center justify-center relative min-h-[300px]"
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-72 rounded-full border-2 border-dashed border-primary/20" />
          </div>
          <Suspense fallback={
            <div className="w-64 h-64 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            <CubeRenderer3D size={260} />
          </Suspense>
        </motion.div>

        <AnimatePresence>
          {solution.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
              <div className="glass-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground uppercase">Solution: {solution.length} moves</span>
                  <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="font-mono text-sm text-center">
                  {solution.slice(0, 20).join(' ')}{solution.length > 20 ? '...' : ''}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {solution.length > 0 && (
          <div className="flex items-center justify-center gap-4 mb-4">
            <button onClick={handleStepBack} disabled={solutionIndex <= 0 || cube.isAnimating} className="btn-icon disabled:opacity-50">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-sm text-muted-foreground font-mono">Step {solutionIndex} / {solution.length}</span>
            <button onClick={handleStepForward} disabled={solutionIndex >= solution.length || cube.isAnimating} className="btn-icon disabled:opacity-50">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

        <div className="flex gap-4 mb-4">
          <button onClick={handleShuffle} disabled={isScrambling || cube.isAnimating} className="btn-secondary flex-1 h-14 flex items-center justify-center gap-2 disabled:opacity-50">
            <Shuffle className="w-5 h-5" /> Shuffle
          </button>
          <button onClick={handleHint} disabled={hints <= 0 || cube.isAnimating || isScrambling} className="btn-primary flex-1 h-14 flex items-center justify-center gap-2 disabled:opacity-50">
            <Lightbulb className="w-5 h-5" /> Hint ({hints}/3)
          </button>
        </div>

        <button onClick={handleReset} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
          <RotateCcw className="w-4 h-4 inline-block mr-1" /> Reset Cube
        </button>
      </main>

      <BottomNav variant="solver" />
    </div>
  );
};

export default Solver;
