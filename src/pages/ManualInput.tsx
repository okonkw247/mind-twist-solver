import { useState, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, RotateCcw, Loader2, Crown, Clock } from 'lucide-react';
import RubiksCube3D from '@/components/RubiksCube3D';
import ColorPicker from '@/components/ColorPicker';
import FaceGrid from '@/components/FaceGrid';
import ColorValidation from '@/components/ColorValidation';
import { useCubeState } from '@/hooks/useCubeState';
import { getSolutionMoves } from '@/lib/kociembaSolver';
import { useToast } from '@/hooks/use-toast';

const FREE_ATTEMPTS = 3;

const ManualInput = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState('red');
  const [isSolving, setIsSolving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [freeAttempts, setFreeAttempts] = useState(() => {
    const saved = localStorage.getItem('jsn_free_attempts');
    return saved ? parseInt(saved, 10) : FREE_ATTEMPTS;
  });
  
  const {
    cubeState,
    currentFaceIndex,
    currentFaceLabel,
    currentFaceColors,
    setStickerOnCurrentFace,
    nextFace,
    prevFace,
    goToFace,
    resetCube,
    filledCount,
    totalCount,
    progress,
    isFaceComplete,
    isCubeComplete,
    faceOrder,
  } = useCubeState(3);

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

    return Object.entries(counts).map(([color, count]) => ({
      color,
      count,
      expected: 9,
    }));
  }, [cubeState]);

  const handleCellClick = (index: number) => {
    setStickerOnCurrentFace(index, selectedColor);
  };

  const handleSolve = async () => {
    const invalidColors = colorCounts.filter(c => c.count !== c.expected);
    if (invalidColors.length > 0) {
      setShowValidation(true);
      toast({
        variant: "destructive",
        title: "Invalid Cube State",
        description: "Each color must appear exactly 9 times",
      });
      return;
    }

    if (freeAttempts <= 0) {
      navigate('/premium');
      return;
    }

    setIsSolving(true);
    
    try {
      const result = await getSolutionMoves(cubeState);
      
      if (result.success && result.moves) {
        const newAttempts = freeAttempts - 1;
        setFreeAttempts(newAttempts);
        localStorage.setItem('jsn_free_attempts', newAttempts.toString());

        navigate('/solution', { 
          state: { 
            solution: result.moves,
            moveCount: result.moves.length,
            cubeState 
          } 
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
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Free Attempts Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary/90 backdrop-blur-sm safe-top">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{freeAttempts} free attempts left</span>
          </div>
          <button
            onClick={() => navigate('/premium')}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-foreground text-background text-sm font-bold"
          >
            <Crown className="w-3 h-3" />
            Upgrade now
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="fixed top-10 left-0 right-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-icon"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold tracking-wider flex-1">MANUAL INPUT</h1>
          <button
            onClick={resetCube}
            className="btn-icon"
            aria-label="Reset cube"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="pt-24 pb-8 px-4">
        {/* Progress */}
        <div className="mb-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {filledCount} / {totalCount} stickers colored
          </p>
          <div className="w-full max-w-xs mx-auto h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Color Count Indicators */}
        <div className="flex justify-center gap-1 mb-4">
          {colorCounts.map(({ color, count }) => {
            const isValid = count <= 9;
            const colorMap: Record<string, string> = {
              red: 'hsl(0, 85%, 50%)', 
              white: 'hsl(0, 0%, 95%)', 
              green: 'hsl(140, 80%, 45%)',
              orange: 'hsl(30, 100%, 50%)', 
              yellow: 'hsl(48, 100%, 50%)', 
              blue: 'hsl(220, 100%, 50%)'
            };
            
            return (
              <div
                key={color}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  !isValid ? 'border-destructive animate-pulse' : 'border-transparent'
                }`}
                style={{ backgroundColor: colorMap[color] }}
                title={`${color}: ${count}/9`}
              >
                <span className={color === 'white' || color === 'yellow' ? 'text-background' : 'text-foreground'}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Face indicators */}
        <div className="flex justify-center gap-2 mb-4">
          {faceOrder.map((face, index) => {
            const isComplete = isFaceComplete(face);
            const isCurrent = index === currentFaceIndex;
            
            return (
              <button
                key={face}
                onClick={() => goToFace(index)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground scale-110'
                    : isComplete
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : index + 1}
              </button>
            );
          })}
        </div>

        {/* 3D Cube Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-6"
        >
          <Suspense fallback={
            <div className="w-[200px] h-[200px] flex items-center justify-center bg-secondary/20 rounded-2xl">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            <RubiksCube3D 
              size={200} 
              autoRotate={false}
              cubeState={Object.values(cubeState)}
            />
          </Suspense>
        </motion.div>

        {/* Current Face Label */}
        <motion.div
          key={currentFaceLabel}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <span className="text-sm text-muted-foreground">Face {currentFaceIndex + 1}</span>
          <h2 className="text-xl font-semibold">{currentFaceLabel}</h2>
        </motion.div>

        {/* Face Grid */}
        <motion.div
          key={currentFaceIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex justify-center mb-6"
        >
          <FaceGrid
            faceColors={currentFaceColors}
            selectedColor={selectedColor}
            onCellClick={handleCellClick}
          />
        </motion.div>

        {/* Color Picker */}
        <div className="mb-6">
          <ColorPicker
            selectedColor={selectedColor}
            onSelectColor={setSelectedColor}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 max-w-md mx-auto mb-6">
          <button
            onClick={prevFace}
            disabled={currentFaceIndex === 0}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 h-14 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            Prev
          </button>
          
          <button
            onClick={nextFace}
            disabled={currentFaceIndex === 5}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 h-14 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Solve Button */}
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSolve}
            disabled={!isCubeComplete || isSolving}
            className={`btn-primary w-full h-16 text-lg flex items-center justify-center gap-2 ${
              !isCubeComplete || isSolving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSolving ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Solving...
              </>
            ) : isCubeComplete ? (
              'Solve Cube'
            ) : (
              'Complete all faces to solve'
            )}
          </button>
        </div>
      </main>

      {/* Color Validation Warning */}
      <ColorValidation
        colorCounts={colorCounts}
        visible={showValidation}
        onDismiss={() => setShowValidation(false)}
      />
    </div>
  );
};

export default ManualInput;
