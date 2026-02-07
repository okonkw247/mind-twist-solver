import { useState, Suspense, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pause, 
  Settings, 
  Shuffle, 
  Lightbulb, 
  Play, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Gauge,
  SkipBack,
  SkipForward
} from 'lucide-react';
import RigidCube3D, { RigidCubeHandle } from '@/components/RigidCube3D';
import BottomNav from '@/components/BottomNav';
import StatCard from '@/components/StatCard';
import confetti from 'canvas-confetti';
import { parseSolution, getSolutionMoves } from '@/lib/kociembaSolver';
import { generateProperScramble } from '@/lib/shuffleAlgorithm';
import { useToast } from '@/hooks/use-toast';

const Solver = () => {
  const navigate = useNavigate();
  const cubeRef = useRef<RigidCubeHandle>(null);
  const { toast } = useToast();
  
  // Timer state
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  
  // Animation states
  const [isScrambling, setIsScrambling] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [solution, setSolution] = useState<string[]>([]);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prev => prev + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centiseconds.toString().padStart(2, '0')}`;
  };

  // Get animation duration based on speed
  const getAnimationDuration = useCallback(() => {
    switch (speed) {
      case 'slow': return 800;
      case 'fast': return 250;
      default: return 450;
    }
  }, [speed]);

  const handleShuffle = useCallback(async () => {
    if (!cubeRef.current || isAnimating) return;
    
    setIsScrambling(true);
    setMoveCount(0);
    setTime(0);
    setIsRunning(false);
    setSolution([]);
    setSolutionIndex(0);
    setIsPlaying(false);
    
    // Reset cube to solved state first
    cubeRef.current.reset();
    
    // Generate proper scramble using LEGAL MOVES ONLY
    // This ensures cube is always solvable (no random color assignment!)
    const scrambleMoves = generateProperScramble(20);
    
    toast({
      title: "Shuffling...",
      description: `Applying ${scrambleMoves.length} moves`,
    });
    
    // Apply each move sequentially with animation
    for (const move of scrambleMoves) {
      await cubeRef.current.executeMove(move, 120);
      await new Promise(r => setTimeout(r, 30));
    }
    
    setIsScrambling(false);
    setIsRunning(true);
    
    toast({
      title: "Scramble Complete!",
      description: "Cube is ready to solve",
    });
  }, [isAnimating, toast]);

  // Fixed Hint button - now properly gets and displays solution
  const handleHint = useCallback(async () => {
    if (isAnimating || isScrambling || !cubeRef.current) return;
    
    setIsAnimating(true);
    
    try {
      const state = cubeRef.current.getCubeState();
      const result = await getSolutionMoves(state);
      
      if (result.success && result.moves && result.moves.length > 0) {
        const moveNotations = result.moves.map(m => m.notation);
        setSolution(moveNotations);
        setSolutionIndex(0);
        setIsRunning(false);
        
        toast({
          title: "Solution Found!",
          description: `${moveNotations.length} moves to solve. Use controls to step through.`,
        });
      } else if (result.moves && result.moves.length === 0) {
        toast({
          title: "Already Solved!",
          description: "The cube is already in solved state.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Could not solve",
          description: result.error || "Invalid cube state",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get solution. Please try again.",
      });
    } finally {
      setIsAnimating(false);
    }
  }, [isAnimating, isScrambling, toast]);

  const handlePauseResume = () => {
    setIsRunning(prev => !prev);
  };

  const handleReset = () => {
    cubeRef.current?.reset();
    setMoveCount(0);
    setTime(0);
    setIsRunning(false);
    setSolution([]);
    setSolutionIndex(0);
    setIsPlaying(false);
  };

  const handleStepForward = useCallback(async () => {
    if (!cubeRef.current || isAnimating || solutionIndex >= solution.length) return;
    
    setIsAnimating(true);
    await cubeRef.current.executeMove(solution[solutionIndex], getAnimationDuration());
    setMoveCount(prev => prev + 1);
    setSolutionIndex(prev => prev + 1);
    setIsAnimating(false);
    
    // Check if solved
    if (solutionIndex >= solution.length - 1) {
      setIsRunning(false);
      setIsPlaying(false);
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 }
      });
      toast({
        title: "Cube Solved!",
        description: `Completed in ${moveCount + 1} moves!`,
      });
    }
  }, [solution, solutionIndex, isAnimating, getAnimationDuration, moveCount, toast]);

  const handleStepBack = useCallback(async () => {
    if (!cubeRef.current || isAnimating || solutionIndex <= 0) return;
    
    setIsAnimating(true);
    await cubeRef.current.undoMove();
    setMoveCount(prev => Math.max(0, prev - 1));
    setSolutionIndex(prev => prev - 1);
    setIsAnimating(false);
  }, [solutionIndex, isAnimating]);

  // Auto-play effect
  useEffect(() => {
    if (isPlaying && !isAnimating && solutionIndex < solution.length) {
      const timer = setTimeout(() => handleStepForward(), 100);
      return () => clearTimeout(timer);
    } else if (solutionIndex >= solution.length) {
      setIsPlaying(false);
    }
  }, [isPlaying, isAnimating, solutionIndex, solution.length, handleStepForward]);

  const handleCopy = () => {
    if (solution.length === 0) return;
    navigator.clipboard.writeText(solution.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Solution copied to clipboard",
    });
  };

  const cycleSpeed = () => {
    setSpeed(s => s === 'slow' ? 'normal' : s === 'normal' ? 'fast' : 'slow');
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button
          onClick={handlePauseResume}
          className="btn-icon"
          aria-label={isRunning ? 'Pause' : 'Resume'}
        >
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        
        <h1 className="text-xl font-bold tracking-wider">3X3 SOLVER</h1>
        
        <button
          onClick={() => navigate('/settings')}
          className="btn-icon"
          aria-label="Settings"
        >
          <Settings className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 px-4 flex flex-col">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <StatCard label="MOVES" value={moveCount} />
          <StatCard label="TIME" value={formatTime(time)} />
        </div>

        {/* 3D Cube */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex items-center justify-center relative min-h-[280px]"
        >
          {/* Circular frame */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-72 rounded-full border-2 border-dashed border-primary/20" />
          </div>
          
          <Suspense fallback={
            <div className="w-64 h-64 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            <RigidCube3D
              ref={cubeRef}
              size={260}
              enableZoom={true}
              enablePan={false}
            />
          </Suspense>
        </motion.div>

        {/* Solution display */}
        <AnimatePresence>
          {solution.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="glass-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground uppercase">
                    Solution: {solution.length} moves
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 justify-center max-h-16 overflow-y-auto">
                  {solution.map((move, i) => (
                    <span 
                      key={i}
                      className={`px-2 py-0.5 rounded text-xs font-mono transition-all ${
                        i < solutionIndex 
                          ? 'bg-green-500/20 text-green-500' 
                          : i === solutionIndex 
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/50' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {move}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Playback controls (when solution exists) */}
        {solution.length > 0 && (
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* Speed selector */}
            <button
              onClick={cycleSpeed}
              className="btn-icon w-10 h-10 bg-secondary text-xs font-bold"
              title={`Speed: ${speed}`}
            >
              {speed === 'slow' ? '0.5x' : speed === 'fast' ? '2x' : '1x'}
            </button>

            <button
              onClick={handleStepBack}
              disabled={solutionIndex <= 0 || isAnimating}
              className="btn-icon w-10 h-10 disabled:opacity-50"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={solutionIndex >= solution.length}
              className="btn-primary w-14 h-14 rounded-full flex items-center justify-center disabled:opacity-50"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>

            <button
              onClick={handleStepForward}
              disabled={solutionIndex >= solution.length || isAnimating}
              className="btn-icon w-10 h-10 disabled:opacity-50"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <span className="text-xs text-muted-foreground font-mono min-w-[60px] text-center">
              {solutionIndex}/{solution.length}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleShuffle}
            disabled={isScrambling || isAnimating}
            className="btn-secondary flex-1 h-14 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Shuffle className="w-5 h-5" />
            Shuffle
          </button>
          
          <button
            onClick={handleHint}
            disabled={isAnimating || isScrambling}
            className="btn-primary flex-1 h-14 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lightbulb className="w-5 h-5" />
            {solution.length > 0 ? 'New Hint' : 'Hint'}
          </button>
        </div>

        {/* Reset button */}
        <button
          onClick={handleReset}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          <RotateCcw className="w-4 h-4 inline-block mr-1" />
          Reset Cube
        </button>
      </main>

      <BottomNav />
    </div>
  );
};

export default Solver;
