import { useState, Suspense, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Share2, 
  Copy, 
  RotateCcw, 
  Check, 
  Sparkles,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';
import RigidCube3D, { RigidCubeHandle } from '@/components/RigidCube3D';
import BottomNav from '@/components/BottomNav';
import confetti from 'canvas-confetti';
import { CubeMove, parseSolution, invertSolution } from '@/lib/kociembaSolver';
import { useToast } from '@/hooks/use-toast';

// Default solution for demo
const defaultMoves: CubeMove[] = parseSolution("R U R' U' R' F R2 U' R' F'");

interface LocationState {
  solution?: CubeMove[];
  moveCount?: number;
  cubeState?: Record<string, string[]>;
}

const Solution = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const cubeRef = useRef<RigidCubeHandle>(null);
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Use solution from navigation state or default
  const moves = locationState?.solution || defaultMoves;
  const totalMoves = moves.length;
  
  // Get animation duration based on speed
  const getAnimationDuration = useCallback(() => {
    switch (speed) {
      case 'slow': return 800;
      case 'fast': return 250;
      default: return 450;
    }
  }, [speed]);

  // Confetti effect on mount
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.3 }
    });
  }, []);

  // Step forward
  const handleStepForward = useCallback(async () => {
    if (!cubeRef.current || isAnimating || currentStep >= totalMoves) return;
    
    setIsAnimating(true);
    await cubeRef.current.executeMove(moves[currentStep].notation, getAnimationDuration());
    setCurrentStep(prev => prev + 1);
    setIsAnimating(false);
    
    if (currentStep >= totalMoves - 1) {
      setIsPlaying(false);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }
  }, [currentStep, totalMoves, moves, isAnimating, getAnimationDuration]);

  // Step back
  const handleStepBack = useCallback(async () => {
    if (!cubeRef.current || isAnimating || currentStep <= 0) return;
    
    setIsAnimating(true);
    await cubeRef.current.undoMove();
    setCurrentStep(prev => prev - 1);
    setIsAnimating(false);
  }, [currentStep, isAnimating]);

  // Auto-play
  useEffect(() => {
    if (isPlaying && !isAnimating && currentStep < totalMoves) {
      const timer = setTimeout(() => handleStepForward(), 100);
      return () => clearTimeout(timer);
    } else if (currentStep >= totalMoves) {
      setIsPlaying(false);
    }
  }, [isPlaying, isAnimating, currentStep, totalMoves, handleStepForward]);

  const handleCopyMoves = () => {
    const moveString = moves.map(m => m.notation).join(' ');
    navigator.clipboard.writeText(moveString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Solution copied to clipboard",
    });
  };

  const handleShare = async () => {
    const moveString = moves.map(m => m.notation).join(' ');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Cube Solution - JSN Solver',
          text: `I solved my Rubik's Cube in ${totalMoves} moves!\n\nSolution: ${moveString}`,
          url: window.location.origin,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyMoves();
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    cubeRef.current?.reset();
  };

  const currentMove = currentStep > 0 ? moves[currentStep - 1] : null;
  const nextMove = currentStep < totalMoves ? moves[currentStep] : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 safe-top">
        <button
          onClick={() => navigate('/home')}
          className="btn-icon"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-wider flex-1">Solution</h1>
      </header>

      <main className="px-4">
        {/* Success Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4 mb-4 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Check className="w-5 h-5 text-green-500" />
            <span className="font-bold text-green-500">Solution Found!</span>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{totalMoves} moves</span> to solve
          </p>
        </motion.div>

        {/* Moves Display */}
        <div className="mb-4 p-3 rounded-xl bg-secondary/50 border border-border">
          <div className="flex flex-wrap gap-1.5 justify-center max-h-20 overflow-y-auto">
            {moves.map((move, index) => (
              <span
                key={index}
                className={`px-2 py-1 rounded font-mono text-sm transition-all ${
                  index < currentStep
                    ? 'bg-green-500/20 text-green-500'
                    : index === currentStep
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {move.notation}
              </span>
            ))}
          </div>
        </div>

        {/* 3D Cube */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-4"
        >
          <Suspense fallback={
            <div className="w-64 h-64 flex items-center justify-center bg-secondary/20 rounded-2xl">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            <RigidCube3D ref={cubeRef} size={260} />
          </Suspense>
        </motion.div>

        {/* Current Move Display */}
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
              <Check className="w-5 h-5 text-green-500" />
              <p className="font-bold text-green-500">Cube Solved!</p>
            </div>
          ) : (
            <>
              <div className="text-4xl font-mono font-bold mb-2 text-primary">
                {currentMove?.notation}
              </div>
              <p className="text-sm text-muted-foreground">
                {currentMove?.description}
              </p>
              {nextMove && (
                <p className="text-xs text-muted-foreground mt-2">
                  Next: <span className="font-mono">{nextMove.notation}</span>
                </p>
              )}
            </>
          )}
        </motion.div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setSpeed(s => s === 'slow' ? 'normal' : s === 'normal' ? 'fast' : 'slow')}
            className="btn-icon w-10 h-10 bg-secondary text-xs font-bold"
          >
            {speed === 'slow' ? '0.5x' : speed === 'fast' ? '2x' : '1x'}
          </button>

          <button
            onClick={handleStepBack}
            disabled={currentStep <= 0 || isAnimating}
            className="btn-icon w-10 h-10 disabled:opacity-50"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={currentStep >= totalMoves}
            className="btn-primary w-14 h-14 rounded-full flex items-center justify-center disabled:opacity-50"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>

          <button
            onClick={handleStepForward}
            disabled={currentStep >= totalMoves || isAnimating}
            className="btn-icon w-10 h-10 disabled:opacity-50"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={handleRestart}
            className="btn-icon w-10 h-10 bg-secondary"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Step counter */}
        <p className="text-center text-sm text-muted-foreground mb-6">
          Step {currentStep} / {totalMoves}
        </p>

        {/* Action Buttons */}
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

      <BottomNav />
    </div>
  );
};

export default Solution;
