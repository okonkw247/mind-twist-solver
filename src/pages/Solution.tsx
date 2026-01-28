import { useState, Suspense, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2, Copy, RotateCcw, Check, Sparkles, GraduationCap, Zap } from 'lucide-react';
import AnimatedRubiksCube, { AnimatedCubeHandle } from '@/components/AnimatedRubiksCube';
import SolveControls from '@/components/SolveControls';
import confetti from 'canvas-confetti';
import { CubeMove, parseSolution } from '@/lib/kociembaSolver';

// Default solution for demo - use parseSolution to create proper CubeMove objects
const defaultMoves: CubeMove[] = parseSolution("R U R' U' R' F R2 U' R' F'");

interface LocationState {
  solution?: CubeMove[];
  moveCount?: number;
  cubeState?: Record<string, string[]>;
}

const faceHighlightColors: Record<string, string> = {
  R: 'shadow-[0_0_30px_rgba(220,38,38,0.6)]',
  L: 'shadow-[0_0_30px_rgba(249,115,22,0.6)]',
  U: 'shadow-[0_0_30px_rgba(255,255,255,0.6)]',
  D: 'shadow-[0_0_30px_rgba(255,215,0,0.6)]',
  F: 'shadow-[0_0_30px_rgba(34,197,94,0.6)]',
  B: 'shadow-[0_0_30px_rgba(37,99,235,0.6)]',
};

const Solution = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const cubeRef = useRef<AnimatedCubeHandle>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [copied, setCopied] = useState(false);
  const [learningMode, setLearningMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Use solution from navigation state or default
  const moves = locationState?.solution || defaultMoves;
  const totalMoves = moves.length;
  
  // Get animation duration based on speed
  const getAnimationDuration = () => {
    switch (speed) {
      case 'slow': return 1200;
      case 'fast': return 300;
      default: return 600;
    }
  };

  // Confetti effect on mount
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.3 }
    });
  }, []);

  // Execute a single move with animation
  const executeMove = async (move: CubeMove) => {
    if (!cubeRef.current) return;
    
    setIsAnimating(true);
    await cubeRef.current.executeMove(move, getAnimationDuration());
    setIsAnimating(false);
  };

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && currentStep < totalMoves && !isAnimating) {
      const runNextMove = async () => {
        const move = moves[currentStep];
        await executeMove(move);
        
        if (currentStep >= totalMoves - 1) {
          setIsPlaying(false);
          // Celebration confetti on completion
          confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.6 }
          });
        } else {
          setCurrentStep(prev => prev + 1);
        }
      };
      
      runNextMove();
    }
  }, [isPlaying, currentStep, isAnimating, totalMoves]);

  const handleStepForward = async () => {
    if (currentStep < totalMoves && !isAnimating) {
      const move = moves[currentStep];
      await executeMove(move);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleStepBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      // Reset cube animation (would need inverse move in full implementation)
      cubeRef.current?.reset();
    }
  };

  const handleCopyMoves = () => {
    const moveString = moves.map(m => m.notation).join(' ');
    navigator.clipboard.writeText(moveString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const moveString = moves.map(m => m.notation).join(' ');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Cube Solution - JSN Solving',
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
  const highlightClass = nextMove ? faceHighlightColors[nextMove.face] || '' : '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 gradient-main">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/home')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white flex-1">Solution</h1>
          
          {/* Mode Toggle */}
          <button
            onClick={() => setLearningMode(!learningMode)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              learningMode 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
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
        {/* Success Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4 mb-4 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Check className="w-5 h-5 text-green-500" />
            <span className="font-bold text-green-500">Solved!</span>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your cube can be solved in <span className="font-semibold text-foreground">{totalMoves} moves</span>
          </p>
        </motion.div>

        {/* All Moves Display */}
        <div className="mb-4 p-3 rounded-xl bg-secondary/50 border border-border">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {moves.map((move, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index + 1)}
                className={`px-2 py-1 rounded font-mono text-sm transition-all ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground scale-110 ring-2 ring-primary/50'
                    : index < currentStep
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {move.notation}
              </button>
            ))}
          </div>
        </div>

        {/* 3D Animated Cube with Highlight */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex justify-center mb-4 rounded-3xl transition-shadow duration-300 ${highlightClass}`}
        >
          <Suspense fallback={
            <div className="w-[260px] h-[260px] flex items-center justify-center bg-secondary/20 rounded-2xl">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            <AnimatedRubiksCube 
              ref={cubeRef}
              size={260} 
              onMoveComplete={(move) => {
                console.log('Move completed:', move.notation);
              }}
            />
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
          ) : currentStep > totalMoves ? (
            <div className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <p className="font-bold text-green-500">Cube Solved!</p>
            </div>
          ) : (
            <>
              <div className="text-4xl font-mono font-bold mb-2 gradient-text">
                {currentMove?.notation}
              </div>
              {learningMode && (
                <p className="text-sm text-muted-foreground">
                  {currentMove?.description}
                </p>
              )}
              {nextMove && learningMode && (
                <p className="text-xs text-muted-foreground mt-2">
                  Next: <span className="font-mono">{nextMove.notation}</span>
                </p>
              )}
            </>
          )}
        </motion.div>

        {/* Playback Controls */}
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
    </div>
  );
};

export default Solution;
