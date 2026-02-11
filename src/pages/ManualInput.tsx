import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Camera, Video } from 'lucide-react';
import { useCubeState } from '@/hooks/useCubeState';
import { getSolutionMoves } from '@/lib/kociembaSolver';
import { useToast } from '@/hooks/use-toast';

const CUBE_COLORS = [
  { name: 'white', hex: 'hsl(0, 0%, 95%)', label: 'W' },
  { name: 'yellow', hex: 'hsl(48, 100%, 50%)', label: 'Y' },
  { name: 'orange', hex: 'hsl(30, 100%, 50%)', label: 'O' },
  { name: 'red', hex: 'hsl(0, 85%, 50%)', label: 'R' },
  { name: 'green', hex: 'hsl(140, 80%, 45%)', label: 'G' },
  { name: 'blue', hex: 'hsl(220, 100%, 50%)', label: 'B' },
];

const ManualInput = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState('white');
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
    filledCount,
    totalCount,
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

    return counts;
  }, [cubeState]);

  const handleCellClick = (index: number) => {
    setStickerOnCurrentFace(index, selectedColor);
  };

  const handleSolve = async () => {
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

  const progress = (currentFaceIndex + 1) / 6;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button
          onClick={() => navigate(-1)}
          className="btn-icon"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-wider">Manual Face Input</h1>
        <button
          onClick={() => navigate('/camera')}
          className="btn-icon"
          aria-label="Camera"
        >
          <Camera className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 px-4 flex flex-col">
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
          <h2 className="text-lg font-semibold uppercase tracking-wide">{currentFaceLabel}</h2>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: CUBE_COLORS.find(c => c.name === selectedColor)?.hex }}
            />
            <span className="text-sm text-primary">Editing</span>
          </div>
        </div>

        {/* 3x3 Face Grid with Mini Cube Preview */}
        <div className="relative flex-1 flex items-center justify-center mb-6">
          {/* Face Grid */}
          <motion.div
            key={currentFaceIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-72 h-72 bg-card rounded-2xl p-4 relative"
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
                        : 'shadow-lg'
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

          {/* Mini Cube Preview */}
          <div className="absolute top-0 right-0 bg-card/80 backdrop-blur rounded-full p-3">
            <div className="w-12 h-12 relative">
              <div className="grid grid-cols-3 gap-0.5 w-full h-full">
                {Array(9).fill(null).map((_, i) => (
                  <div 
                    key={i} 
                    className={`rounded-sm ${i === 4 ? 'bg-muted-foreground/50' : 'bg-muted'}`}
                  />
                ))}
              </div>
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground uppercase">
                {faceOrder[currentFaceIndex].substring(0, 5)}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-center text-muted-foreground text-sm mb-6">
          Tap a square to cycle colors or select from the palette below
        </p>

        {/* Color Palette */}
        <div className="flex justify-center gap-3 mb-6">
          {CUBE_COLORS.map((color) => {
            const isSelected = selectedColor === color.name;
            const count = colorCounts[color.name] || 0;
            const isComplete = count === 9;
            
            return (
              <button
                key={color.name}
                onClick={() => setSelectedColor(color.name)}
                className={`relative w-12 h-12 rounded-full transition-all ${
                  isSelected ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {isSelected && (
                  <Check className={`absolute inset-0 m-auto w-5 h-5 ${
                    color.name === 'white' || color.name === 'yellow' ? 'text-background' : 'text-foreground'
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={prevFace}
            disabled={currentFaceIndex === 0}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 h-14 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
            Back Face
          </button>
          
          <button
            onClick={nextFace}
            disabled={currentFaceIndex === 5}
            className="btn-primary flex-1 flex items-center justify-center gap-2 h-14 disabled:opacity-50"
          >
            Right Face
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Switch to Camera */}
        <button
          onClick={() => navigate('/camera')}
          className="w-full py-4 rounded-xl bg-secondary/50 flex items-center justify-center gap-2 text-muted-foreground mb-6"
        >
          <Video className="w-5 h-5" />
          Switch to Camera Scan
        </button>
      </main>
    </div>
  );
};

export default ManualInput;
