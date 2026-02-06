import { useState, useMemo, useRef, useCallback, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Camera, 
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw
} from 'lucide-react';
import RigidCube3D, { RigidCubeHandle, FaceName } from '@/components/RigidCube3D';
import BottomNav from '@/components/BottomNav';
import { getSolutionMoves } from '@/lib/kociembaSolver';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

const CUBE_COLORS = [
  { name: 'white', hex: '#f5f5f5', label: 'W' },
  { name: 'yellow', hex: '#ffd700', label: 'Y' },
  { name: 'orange', hex: '#f97316', label: 'O' },
  { name: 'red', hex: '#dc2626', label: 'R' },
  { name: 'green', hex: '#22c55e', label: 'G' },
  { name: 'blue', hex: '#2563eb', label: 'B' },
];

const FACE_ORDER = ['front', 'right', 'up', 'down', 'left', 'back'];
const FACE_LABELS = ['Front (Green)', 'Right (Red)', 'Up (White)', 'Down (Yellow)', 'Left (Orange)', 'Back (Blue)'];

const ManualInput = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cubeRef = useRef<RigidCubeHandle>(null);
  
  const [selectedColor, setSelectedColor] = useState('white');
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [cubeState, setCubeState] = useState<Record<string, string[]>>(() => ({
    front: Array(9).fill('empty'),
    right: Array(9).fill('empty'),
    up: Array(9).fill('empty'),
    down: Array(9).fill('empty'),
    left: Array(9).fill('empty'),
    back: Array(9).fill('empty'),
  }));
  
  // Solution state
  const [solution, setSolution] = useState<string[]>([]);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  const currentFaceKey = FACE_ORDER[currentFaceIndex];
  const currentFaceColors = cubeState[currentFaceKey];

  // Count colors
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

  const filledCount = useMemo(() => {
    return Object.values(cubeState).flat().filter(c => c !== 'empty').length;
  }, [cubeState]);

  // Handle cell click - set color
  const handleCellClick = (index: number) => {
    setCubeState(prev => {
      const newState = { ...prev };
      newState[currentFaceKey] = [...prev[currentFaceKey]];
      newState[currentFaceKey][index] = selectedColor;
      return newState;
    });
  };

  // Navigation
  const nextFace = () => {
    if (currentFaceIndex < 5) setCurrentFaceIndex(prev => prev + 1);
  };

  const prevFace = () => {
    if (currentFaceIndex > 0) setCurrentFaceIndex(prev => prev - 1);
  };

  // Get animation duration
  const getAnimationDuration = useCallback(() => {
    switch (speed) {
      case 'slow': return 800;
      case 'fast': return 250;
      default: return 450;
    }
  }, [speed]);

  // Auto-solve when complete
  const handleSolve = useCallback(async () => {
    if (!isCubeComplete) {
      toast({
        variant: "destructive",
        title: "Incomplete Cube",
        description: "Please fill in all 54 stickers before solving.",
      });
      return;
    }

    // Check color counts
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
        const moveNotations = result.moves.map(m => m.notation);
        setSolution(moveNotations);
        setSolutionIndex(0);
        
        toast({
          title: "Solution Found!",
          description: `${moveNotations.length} moves to solve`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Invalid Cube State",
          description: result.error || "Please check your cube colors",
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
  }, [cubeState, colorCounts, isCubeComplete, toast]);

  // Auto-solve when cube becomes complete
  useEffect(() => {
    if (isCubeComplete && solution.length === 0 && !isSolving) {
      handleSolve();
    }
  }, [isCubeComplete, solution.length, isSolving, handleSolve]);

  // Step forward
  const handleStepForward = useCallback(async () => {
    if (!cubeRef.current || isAnimating || solutionIndex >= solution.length) return;
    
    setIsAnimating(true);
    await cubeRef.current.executeMove(solution[solutionIndex], getAnimationDuration());
    setSolutionIndex(prev => prev + 1);
    setIsAnimating(false);
    
    if (solutionIndex >= solution.length - 1) {
      setIsPlaying(false);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }
  }, [solution, solutionIndex, isAnimating, getAnimationDuration]);

  // Step back
  const handleStepBack = useCallback(async () => {
    if (!cubeRef.current || isAnimating || solutionIndex <= 0) return;
    
    setIsAnimating(true);
    await cubeRef.current.undoMove();
    setSolutionIndex(prev => prev - 1);
    setIsAnimating(false);
  }, [solutionIndex, isAnimating]);

  // Auto-play
  useEffect(() => {
    if (isPlaying && !isAnimating && solutionIndex < solution.length) {
      const timer = setTimeout(() => handleStepForward(), 100);
      return () => clearTimeout(timer);
    } else if (solutionIndex >= solution.length) {
      setIsPlaying(false);
    }
  }, [isPlaying, isAnimating, solutionIndex, solution.length, handleStepForward]);

  // Reset
  const handleReset = () => {
    setCubeState({
      front: Array(9).fill('empty'),
      right: Array(9).fill('empty'),
      up: Array(9).fill('empty'),
      down: Array(9).fill('empty'),
      left: Array(9).fill('empty'),
      back: Array(9).fill('empty'),
    });
    setSolution([]);
    setSolutionIndex(0);
    setIsPlaying(false);
    setCurrentFaceIndex(0);
    cubeRef.current?.reset();
  };

  const hasSolution = solution.length > 0;
  const progress = (currentFaceIndex + 1) / 6;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button
          onClick={() => navigate(-1)}
          className="btn-icon"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-wider">Manual Input</h1>
        <button
          onClick={() => navigate('/camera')}
          className="btn-icon"
          aria-label="Camera"
        >
          <Camera className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 px-4 flex flex-col">
        {!hasSolution ? (
          <>
            {/* Face Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Face Progress</span>
                <span className="text-sm text-muted-foreground">{currentFaceIndex + 1}/6</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Current Face Label */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{FACE_LABELS[currentFaceIndex]}</h2>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: CUBE_COLORS.find(c => c.name === selectedColor)?.hex }}
                />
                <span className="text-sm text-primary">Selected</span>
              </div>
            </div>

            {/* 3x3 Face Grid */}
            <motion.div
              key={currentFaceIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-xs mx-auto aspect-square bg-card rounded-2xl p-4 mb-6"
            >
              <div className="grid grid-cols-3 gap-2 w-full h-full">
                {currentFaceColors.map((color, index) => {
                  const colorData = CUBE_COLORS.find(c => c.name === color);
                  const isEmpty = color === 'empty';
                  
                  return (
                    <motion.button
                      key={index}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCellClick(index)}
                      className={`rounded-xl flex items-center justify-center transition-all ${
                        isEmpty 
                          ? 'bg-muted border-2 border-dashed border-muted-foreground/30' 
                          : 'shadow-lg border-2 border-black/10'
                      }`}
                      style={!isEmpty ? { backgroundColor: colorData?.hex } : {}}
                    >
                      {index === 4 && isEmpty && (
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Color Palette */}
            <div className="flex justify-center gap-3 mb-6">
              {CUBE_COLORS.map((color) => {
                const isSelected = selectedColor === color.name;
                const count = colorCounts[color.name] || 0;
                
                return (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`relative w-11 h-11 rounded-full transition-all ${
                      isSelected ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    {isSelected && (
                      <Check className={`absolute inset-0 m-auto w-5 h-5 ${
                        color.name === 'white' || color.name === 'yellow' ? 'text-gray-800' : 'text-white'
                      }`} />
                    )}
                    <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] ${
                      count === 9 ? 'text-green-500' : 'text-muted-foreground'
                    }`}>
                      {count}/9
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filled count */}
            <p className="text-center text-sm text-muted-foreground mb-4">
              {filledCount}/54 stickers filled
            </p>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={prevFace}
                disabled={currentFaceIndex === 0}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 h-12 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
              
              <button
                onClick={nextFace}
                disabled={currentFaceIndex === 5}
                className="btn-primary flex-1 flex items-center justify-center gap-2 h-12 disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Solve button */}
            <button
              onClick={handleSolve}
              disabled={!isCubeComplete || isSolving}
              className="btn-primary w-full h-14 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSolving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Solving...
                </>
              ) : (
                <>Solve Cube ({filledCount}/54)</>
              )}
            </button>
          </>
        ) : (
          <>
            {/* 3D Cube with solution */}
            <div className="flex-1 flex items-center justify-center min-h-[280px]">
              <Suspense fallback={
                <div className="w-64 h-64 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              }>
                <RigidCube3D ref={cubeRef} size={260} />
              </Suspense>
            </div>

            {/* Solution info */}
            <div className="glass-card mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase">
                  Solution: {solution.length} moves
                </span>
                <span className="text-sm font-mono">
                  Step {solutionIndex} / {solution.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 justify-center max-h-20 overflow-y-auto">
                {solution.map((move, i) => (
                  <span 
                    key={i}
                    className={`px-2 py-0.5 rounded text-xs font-mono ${
                      i < solutionIndex 
                        ? 'bg-green-500/20 text-green-500' 
                        : i === solutionIndex 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {move}
                  </span>
                ))}
              </div>
            </div>

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

              <button
                onClick={handleReset}
                className="btn-icon w-10 h-10 bg-secondary"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default ManualInput;
