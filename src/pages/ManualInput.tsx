import { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, RotateCcw, Loader2 } from 'lucide-react';
import RubiksCube3D from '@/components/RubiksCube3D';
import ColorPicker from '@/components/ColorPicker';
import FaceGrid from '@/components/FaceGrid';
import { useCubeState } from '@/hooks/useCubeState';
import { solveCube } from '@/lib/cubeSolver';
import { useToast } from '@/hooks/use-toast';

const ManualInput = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState('red');
  const [isSolving, setIsSolving] = useState(false);
  
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

  const handleCellClick = (index: number) => {
    setStickerOnCurrentFace(index, selectedColor);
  };

  const handleSolve = async () => {
    setIsSolving(true);
    
    try {
      const result = await solveCube(cubeState);
      
      if (result.success && result.solution) {
        // Navigate to solution page with the solution data
        navigate('/solution', { 
          state: { 
            solution: result.solution,
            moveCount: result.moveCount,
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold flex-1">Manual Input</h1>
          <button
            onClick={resetCube}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Reset cube"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="pt-16 pb-8 px-4">
        {/* Progress */}
        <div className="mb-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {filledCount} / {totalCount} stickers colored
          </p>
          <div className="w-full max-w-xs mx-auto h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan to-hot-pink"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
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
                    ? 'bg-green-500/20 text-green-500'
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
            <div className="w-[250px] h-[250px] flex items-center justify-center bg-secondary/20 rounded-2xl">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            <RubiksCube3D 
              size={250} 
              autoRotate={false}
              cubeState={Object.values(cubeState)}
            />
          </Suspense>
        </motion.div>

        {/* Current Face Label */}
        <motion.h2
          key={currentFaceLabel}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-semibold text-center mb-4"
        >
          {currentFaceLabel}
        </motion.h2>

        {/* Face Grid */}
        <motion.div
          key={currentFaceIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex justify-center mb-8"
        >
          <FaceGrid
            faceColors={currentFaceColors}
            selectedColor={selectedColor}
            onCellClick={handleCellClick}
          />
        </motion.div>

        {/* Color Picker */}
        <div className="mb-8">
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
            Previous
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
              !isCubeComplete || isSolving ? 'opacity-50 cursor-not-allowed' : 'animate-pulse-glow'
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
    </div>
  );
};

export default ManualInput;
