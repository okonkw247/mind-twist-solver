import { useState, Suspense, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Share2, Copy, RotateCcw, Check, Sparkles } from 'lucide-react';
import RubiksCube3D from '@/components/RubiksCube3D';
import confetti from 'canvas-confetti';
import { CubeMove, parseSolution } from '@/lib/cubeSolver';

// Default solution for demo
const defaultMoves: CubeMove[] = [
  { notation: "R", face: "R", direction: "clockwise", description: "Rotate right face clockwise" },
  { notation: "U", face: "U", direction: "clockwise", description: "Rotate upper face clockwise" },
  { notation: "R'", face: "R", direction: "counter-clockwise", description: "Rotate right face counter-clockwise" },
  { notation: "U'", face: "U", direction: "counter-clockwise", description: "Rotate upper face counter-clockwise" },
  { notation: "R", face: "R", direction: "clockwise", description: "Rotate right face clockwise" },
  { notation: "U", face: "U", direction: "clockwise", description: "Rotate upper face clockwise" },
  { notation: "R'", face: "R", direction: "counter-clockwise", description: "Rotate right face counter-clockwise" },
  { notation: "F", face: "F", direction: "clockwise", description: "Rotate front face clockwise" },
  { notation: "R", face: "R", direction: "clockwise", description: "Rotate right face clockwise" },
  { notation: "F'", face: "F", direction: "counter-clockwise", description: "Rotate front face counter-clockwise" },
];

interface LocationState {
  solution?: CubeMove[];
  moveCount?: number;
  cubeState?: Record<string, string[]>;
}

const Solution = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [copied, setCopied] = useState(false);

  // Use solution from navigation state or default
  const moves = locationState?.solution || defaultMoves;
  const totalMoves = moves.length;
  const progress = ((currentStep + 1) / totalMoves) * 100;

  // Confetti effect on mount
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.3 }
    });
  }, []);

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && currentStep < totalMoves - 1) {
      const delay = speed === 'slow' ? 2000 : speed === 'fast' ? 500 : 1000;
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else if (currentStep >= totalMoves - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, speed, totalMoves]);

  const handleNext = () => {
    if (currentStep < totalMoves - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
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
      // Fallback to copy
      handleCopyMoves();
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 gradient-main">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Solution</h1>
        </div>
      </header>

      <main className="pt-16 pb-8 px-4">
        {/* Success Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4 mb-6 text-center"
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

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Step {currentStep + 1} of {totalMoves}</span>
            <span className="font-mono font-bold text-lg">{moves[currentStep]?.notation}</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan to-hot-pink"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* All Moves Display */}
        <div className="mb-4 p-3 rounded-xl bg-secondary/50 border border-border">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {moves.map((move, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`px-2 py-1 rounded font-mono text-sm transition-all ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground scale-110'
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

        {/* 3D Cube */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-6"
        >
          <Suspense fallback={
            <div className="w-[280px] h-[280px] flex items-center justify-center bg-secondary/20 rounded-2xl">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            <RubiksCube3D size={280} autoRotate={false} />
          </Suspense>
        </motion.div>

        {/* Move Description */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card text-center mb-6"
        >
          <p className="text-lg font-medium">{moves[currentStep]?.description}</p>
        </motion.div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <SkipBack className="w-6 h-6" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-4 rounded-full bg-primary hover:bg-primary/90 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentStep === totalMoves - 1}
            className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex justify-center gap-2 mb-8">
          {(['slow', 'normal', 'fast'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                speed === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 max-w-md mx-auto">
          <button
            onClick={() => navigate('/')}
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
