import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Camera, Image, Pencil, Settings } from 'lucide-react';

const FACES = ['F', 'R', 'U', 'D', 'L', 'B'];
const FACE_NAMES = ['Front', 'Right', 'Up', 'Down', 'Left', 'Back'];
const FACE_COLORS = ['White', 'Blue', 'Yellow', 'Green', 'Orange', 'Red'];

const CameraInput = () => {
  const navigate = useNavigate();
  const [currentFace, setCurrentFace] = useState(0);
  const [scannedFaces, setScannedFaces] = useState<boolean[]>(Array(6).fill(false));
  const [faceColors, setFaceColors] = useState<string[][]>(
    Array(6).fill(null).map(() => Array(9).fill(''))
  );

  const handleScan = () => {
    // Simulate scanning - in real implementation this would use camera
    const colors = ['white', 'yellow', 'red', 'orange', 'blue', 'green'];
    const newFaceColors = Array(9).fill('').map(() => 
      colors[Math.floor(Math.random() * colors.length)]
    );
    
    const newColors = [...faceColors];
    newColors[currentFace] = newFaceColors;
    setFaceColors(newColors);
    
    const newScanned = [...scannedFaces];
    newScanned[currentFace] = true;
    setScannedFaces(newScanned);
    
    // Auto-advance to next face
    if (currentFace < 5) {
      setTimeout(() => setCurrentFace(currentFace + 1), 500);
    }
  };

  const completedFaces = scannedFaces.filter(Boolean).length;

  const colorMap: Record<string, string> = {
    white: 'hsl(0, 0%, 95%)',
    yellow: 'hsl(48, 100%, 50%)',
    red: 'hsl(0, 85%, 50%)',
    orange: 'hsl(30, 100%, 50%)',
    blue: 'hsl(220, 100%, 50%)',
    green: 'hsl(140, 80%, 45%)',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button
          onClick={() => navigate(-1)}
          className="btn-icon"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <h1 className="text-xl font-bold tracking-wider">AR Solver</h1>
        
        <button
          onClick={() => {
            setFaceColors(Array(6).fill(null).map(() => Array(9).fill('')));
            setScannedFaces(Array(6).fill(false));
            setCurrentFace(0);
          }}
          className="btn-icon"
          aria-label="Clear"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 px-4 flex flex-col">
        {/* Face indicator bar */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card">
            {FACES.map((face, index) => (
              <button
                key={face}
                onClick={() => setCurrentFace(index)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                  index === currentFace
                    ? 'bg-foreground text-background'
                    : scannedFaces[index]
                    ? 'bg-primary/30 text-primary'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {face}
              </button>
            ))}
          </div>
        </div>

        {/* Scanning grid container */}
        <div className="relative flex-1 flex flex-col items-center justify-center">
          {/* Step indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wide">
            Step {currentFace + 1}/6: {FACE_NAMES[currentFace]} Face
          </div>
          
          {/* 3x3 scanning grid */}
          <div className="relative w-72 h-72 border-2 border-primary rounded-2xl p-4 mt-12 mb-8"
               style={{ 
                 boxShadow: '0 0 30px hsl(var(--primary) / 0.3)',
                 background: 'linear-gradient(135deg, hsl(var(--primary) / 0.05), transparent)'
               }}>
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-primary rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-primary rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-primary rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-primary rounded-br-xl" />
            
            <div className="grid grid-cols-3 gap-2 w-full h-full">
              {Array(9).fill(null).map((_, index) => {
                const color = faceColors[currentFace][index];
                
                return (
                  <div
                    key={index}
                    className={`rounded-xl border-2 transition-all ${
                      color 
                        ? 'border-transparent' 
                        : 'border-primary/30 bg-secondary/50'
                    }`}
                    style={color ? { backgroundColor: colorMap[color] } : {}}
                  >
                    {index === 4 && !color && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-8 rounded-lg border-2 border-muted-foreground/30 flex items-center justify-center">
                          <Camera className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center px-6 mb-8">
            <h2 className="text-2xl font-bold mb-2">
              Scan the {FACE_NAMES[currentFace]} ({FACE_COLORS[currentFace]}) face
            </h2>
            <p className="text-muted-foreground">
              Center the {FACE_COLORS[currentFace].toLowerCase()} middle sticker in the grid and hold steady
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="pb-8 safe-bottom">
          <div className="flex justify-center items-center gap-6 mb-6">
            <button
              onClick={() => {}}
              className="btn-icon w-14 h-14 bg-secondary"
              aria-label="Gallery"
            >
              <Image className="w-6 h-6" />
            </button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleScan}
              className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg"
              style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.5)' }}
            >
              <Camera className="w-8 h-8" />
            </motion.button>
            
            <button
              onClick={() => navigate('/manual-input')}
              className="btn-icon w-14 h-14 bg-secondary"
              aria-label="Manual edit"
            >
              <Pencil className="w-6 h-6" />
            </button>
          </div>

          {/* Solve button */}
          <button
            onClick={() => {
              if (completedFaces === 6) {
                navigate('/solution', { state: { faceColors } });
              }
            }}
            disabled={completedFaces < 6}
            className="btn-secondary w-full h-14 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Settings className="w-5 h-5" />
            Solve Cube ({completedFaces}/6)
          </button>
        </div>
      </main>
    </div>
  );
};

export default CameraInput;
