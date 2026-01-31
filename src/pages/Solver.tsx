// JSN Solving - Full Visual Solver Page
// Real-time 3D cube engine with continuous rendering and independent camera

import { useState, Suspense, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Share2, 
  Copy, 
  Check, 
  Sparkles, 
  Palette,
  Eye,
  RotateCcw,
  Loader2,
  ZoomIn,
  ZoomOut,
  Move3D
} from 'lucide-react';
import RealTimeCube3D, { RealTimeCubeHandle, FaceName, COLOR_HEX } from '@/components/RealTimeCube3D';
import AlgorithmDisplay from '@/components/AlgorithmDisplay';
import ColorPalette from '@/components/ColorPalette';
import SolveAnimationControls, { AnimationSpeed } from '@/components/SolveAnimationControls';
import confetti from 'canvas-confetti';
import { CubeMove, parseSolution, getSolutionMoves } from '@/lib/kociembaSolver';
import { FACE_TO_KEY, getInverseNotation } from '@/lib/cubeStateManager';
import { useToast } from '@/hooks/use-toast';

interface LocationState {
  solution?: CubeMove[];
  moveCount?: number;
  cubeState?: Record<string, string[]>;
}

const SolverPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const cubeRef = useRef<RealTimeCubeHandle>(null);
  const { toast } = useToast();
  
  // Mode states
  const [isManualMode, setIsManualMode] = useState(!locationState?.solution);
  const [selectedColor, setSelectedColor] = useState('green');
  
  // Cube state for manual mode
  const [cubeState, setCubeState] = useState<Record<string, string[]>>(() => {
    if (locationState?.cubeState) return locationState.cubeState;
    return {
      front: Array(9).fill('empty'),
      back: Array(9).fill('empty'),
      up: Array(9).fill('empty'),
      down: Array(9).fill('empty'),
      left: Array(9).fill('empty'),
      right: Array(9).fill('empty'),
    };
  });
  
  // Solve states
  const [moves, setMoves] = useState<CubeMove[]>(locationState?.solution || []);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Track executed moves for step back
  const executedMovesRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  
  // Color counts for validation
  const colorCounts = useMemo(() => {
    const counts: Record<string, number> = {
      red: 0, white: 0, green: 0, orange: 0, yellow: 0, blue: 0
    };
    
    Object.values(cubeState).forEach(face => {
      face.forEach(color => {
        if (color && color !== 'empty' && counts[color] !== undefined) {
          counts[color]++;
        }
      });
    });
    
    return counts;
  }, [cubeState]);
  
  // Check if cube is complete
  const isCubeComplete = useMemo(() => {
    return Object.values(colorCounts).every(count => count === 9);
  }, [colorCounts]);
  
  // Highlighted face based on next move
  const highlightedFace = useMemo(() => {
    if (isManualMode || currentStep >= moves.length) return undefined;
    return moves[currentStep]?.face as FaceName;
  }, [isManualMode, currentStep, moves]);
  
  // Animation duration based on speed
  const getAnimationDuration = useCallback(() => {
    switch (speed) {
      case 'slow': return 800;
      case 'fast': return 250;
      default: return 450;
    }
  }, [speed]);
  
  // Get pause between moves
  const getPauseDuration = useCallback(() => {
    switch (speed) {
      case 'slow': return 400;
      case 'fast': return 50;
      default: return 150;
    }
  }, [speed]);
  
  // Handle facelet click in manual mode
  const handleFaceletClick = useCallback((face: FaceName, index: number) => {
    if (!isManualMode) return;
    
    const faceKey = FACE_TO_KEY[face];
    setCubeState(prev => {
      const newState = { ...prev };
      newState[faceKey] = [...prev[faceKey]];
      newState[faceKey][index] = selectedColor;
      return newState;
    });
  }, [isManualMode, selectedColor]);
  
  // Execute single move with animation
  const executeMove = useCallback(async (move: CubeMove) => {
    if (!cubeRef.current) return;
    
    setIsAnimating(true);
    await cubeRef.current.executeMove(move.notation, getAnimationDuration());
    executedMovesRef.current.push(move.notation);
    
    // Pause between moves for readability
    await new Promise(r => setTimeout(r, getPauseDuration()));
    setIsAnimating(false);
  }, [getAnimationDuration, getPauseDuration]);
  
  // Auto-play logic
  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);
  
  useEffect(() => {
    if (!isPlaying || isPaused || isAnimating || currentStep >= moves.length) return;
    
    const runNextMove = async () => {
      if (!playingRef.current) return;
      
      const move = moves[currentStep];
      await executeMove(move);
      
      if (!playingRef.current) return;
      
      if (currentStep >= moves.length - 1) {
        setIsPlaying(false);
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 }
        });
      }
      setCurrentStep(prev => prev + 1);
    };
    
    runNextMove();
  }, [isPlaying, isPaused, isAnimating, currentStep, moves, executeMove]);
  
  // Handlers
  const handleStepForward = async () => {
    if (currentStep < moves.length && !isAnimating) {
      await executeMove(moves[currentStep]);
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handleStepBack = async () => {
    if (currentStep > 0 && !isAnimating) {
      const lastNotation = executedMovesRef.current.pop();
      if (lastNotation && cubeRef.current) {
        const inverse = getInverseNotation(lastNotation);
        setIsAnimating(true);
        await cubeRef.current.executeMove(inverse, getAnimationDuration());
        setIsAnimating(false);
        setCurrentStep(prev => prev - 1);
      }
    }
  };
  
  const handlePause = () => {
    setIsPlaying(false);
    setIsPaused(true);
    cubeRef.current?.pauseAnimation();
  };
  
  const handlePlay = () => {
    if (isPaused) {
      cubeRef.current?.resumeAnimation();
    }
    setIsPaused(false);
    setIsPlaying(true);
  };
  
  const handleRestart = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setIsPaused(false);
    executedMovesRef.current = [];
    
    // Reset cube and reapply initial state
    if (cubeRef.current) {
      if (locationState?.cubeState) {
        cubeRef.current.setCubeState(locationState.cubeState);
      } else {
        cubeRef.current.reset();
      }
    }
  };
  
  const handleSolve = async () => {
    const invalidColors = Object.entries(colorCounts).filter(([_, count]) => count !== 9);
    if (invalidColors.length > 0) {
      toast({
        variant: "destructive",
        title: "Invalid Cube State",
        description: "Each color must appear exactly 9 times",
      });
      return;
    }
    
    setIsSolving(true);
    
    try {
      const result = await getSolutionMoves(cubeState);
      
      if (result.success && result.moves) {
        setMoves(result.moves);
        setIsManualMode(false);
        setCurrentStep(0);
        executedMovesRef.current = [];
        
        // Apply the cube state to the 3D cube
        cubeRef.current?.setCubeState(cubeState);
        
        toast({
          title: "Solution Found!",
          description: `${result.moves.length} moves to solve`,
        });
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.3 }
        });
      } else {
        toast({
          variant: "destructive",
          title: "Invalid Cube State",
          description: result.error || "This cube configuration is impossible",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to solve cube. Please try again.",
      });
    } finally {
      setIsSolving(false);
    }
  };
  
  const handleCopy = () => {
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
          text: `I solved my Rubik's Cube in ${moves.length} moves!\n\nSolution: ${moveString}`,
          url: window.location.origin,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };
  
  const handleResetCube = () => {
    setCubeState({
      front: Array(9).fill('empty'),
      back: Array(9).fill('empty'),
      up: Array(9).fill('empty'),
      down: Array(9).fill('empty'),
      left: Array(9).fill('empty'),
      right: Array(9).fill('empty'),
    });
    cubeRef.current?.reset();
    setMoves([]);
    setCurrentStep(0);
    executedMovesRef.current = [];
  };
  
  const toggleMode = () => {
    if (!isManualMode) {
      setIsManualMode(true);
      setIsPlaying(false);
    } else {
      if (isCubeComplete) {
        handleSolve();
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 gradient-main">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <h1 className="text-lg font-semibold text-white flex-1 flex items-center gap-2">
            JSN Solving
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </h1>
          
          {/* Mode Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
              isManualMode 
                ? 'bg-orange-500/90 text-white' 
                : 'bg-green-500/90 text-white'
            }`}
          >
            {isManualMode ? (
              <>
                <Palette className="w-4 h-4" />
                Manual
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Solving
              </>
            )}
          </motion.button>
        </div>
      </header>
      
      <main className="pt-16 pb-8 px-4">
        {/* Algorithm Display - Only in solve mode */}
        <AnimatePresence>
          {!isManualMode && moves.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="bg-card/50 rounded-2xl p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">
                    {moves.length} moves
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <AlgorithmDisplay 
                  moves={moves} 
                  currentStep={currentStep}
                  showArrows={true}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 3D Cube Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative flex justify-center mb-4"
        >
          {/* Camera controls */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => cubeRef.current?.resetCamera()}
              className="p-2 rounded-lg bg-secondary/80 backdrop-blur-sm hover:bg-secondary transition-all"
              title="Reset Camera"
            >
              <RotateCcw className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg bg-secondary/80 backdrop-blur-sm hover:bg-secondary transition-all"
              title="Orbit controls active"
            >
              <Move3D className="w-4 h-4" />
            </motion.button>
          </div>
          
          <Suspense fallback={
            <div className="w-[300px] h-[300px] flex items-center justify-center bg-secondary/20 rounded-2xl">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            <RealTimeCube3D
              ref={cubeRef}
              size={300}
              initialState={isManualMode ? cubeState : undefined}
              isManualMode={isManualMode}
              onFaceletClick={handleFaceletClick}
              highlightedFace={highlightedFace}
              enableZoom={true}
              enablePan={false}
            />
          </Suspense>
        </motion.div>
        
        {/* Manual Mode UI */}
        <AnimatePresence>
          {isManualMode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              {/* Instructions */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Tap cube faces to paint colors • Drag to rotate camera • Pinch to zoom
                </p>
              </div>
              
              {/* Color Palette */}
              <div className="flex justify-center">
                <ColorPalette
                  selectedColor={selectedColor}
                  onSelectColor={setSelectedColor}
                  colorCounts={colorCounts}
                  size="lg"
                />
              </div>
              
              {/* Validation Status */}
              <div className="flex justify-center gap-2 flex-wrap">
                {Object.entries(colorCounts).map(([color, count]) => {
                  const isValid = count === 9;
                  const isOver = count > 9;
                  
                  return (
                    <div
                      key={color}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                        isValid 
                          ? 'bg-green-500/20 text-green-500' 
                          : isOver 
                            ? 'bg-red-500/20 text-red-500 animate-pulse' 
                            : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: COLOR_HEX[color as keyof typeof COLOR_HEX] }}
                      />
                      <span>{count}/9</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 max-w-md mx-auto">
                <button
                  onClick={handleResetCube}
                  className="btn-secondary flex-1 h-12 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                
                <button
                  onClick={handleSolve}
                  disabled={!isCubeComplete || isSolving}
                  className={`btn-primary flex-1 h-12 flex items-center justify-center gap-2 ${
                    !isCubeComplete || isSolving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSolving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Solving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Solve
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Solve Mode UI */}
        <AnimatePresence>
          {!isManualMode && moves.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              {/* Current Move Display */}
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card text-center"
              >
                {currentStep === 0 ? (
                  <p className="text-muted-foreground">Press play to start solving</p>
                ) : currentStep >= moves.length ? (
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-6 h-6 text-green-500" />
                    <p className="text-xl font-bold text-green-500">Cube Solved!</p>
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                  </div>
                ) : (
                  <>
                    <div className="text-5xl font-mono font-bold mb-2 gradient-text">
                      {moves[currentStep - 1]?.notation}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {moves[currentStep - 1]?.description}
                    </p>
                  </>
                )}
              </motion.div>
              
              {/* Animation Controls */}
              <SolveAnimationControls
                isPlaying={isPlaying}
                currentStep={currentStep}
                totalSteps={moves.length}
                speed={speed}
                isAnimating={isAnimating}
                onPlay={handlePlay}
                onPause={handlePause}
                onStepForward={handleStepForward}
                onStepBack={handleStepBack}
                onRestart={handleRestart}
                onSpeedChange={setSpeed}
              />
              
              {/* Bottom Actions */}
              <div className="flex gap-3 max-w-md mx-auto">
                <button
                  onClick={() => setIsManualMode(true)}
                  className="btn-secondary flex-1 h-12 flex items-center justify-center gap-2"
                >
                  <Palette className="w-4 h-4" />
                  Edit Cube
                </button>
                
                <button
                  onClick={() => navigate('/')}
                  className="btn-primary flex-1 h-12 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  New Cube
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Empty state - no solution yet and not in manual mode */}
        <AnimatePresence>
          {!isManualMode && moves.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <p className="text-muted-foreground mb-4">No solution loaded</p>
              <button
                onClick={() => setIsManualMode(true)}
                className="btn-primary px-8 py-3"
              >
                Enter Cube Colors
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default SolverPage;
