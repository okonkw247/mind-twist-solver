import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Trash2, 
  Camera, 
  CheckCircle2, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  RotateCcw,
  Gauge,
  AlertCircle,
  Pencil,
  Puzzle
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import RigidCube3D, { RigidCubeHandle } from '@/components/RigidCube3D';
import { getSolutionMoves, CubeMove, parseSolution } from '@/lib/kociembaSolver';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

const FACES = ['F', 'R', 'U', 'D', 'L', 'B'] as const;
const FACE_NAMES = ['Front', 'Right', 'Up', 'Down', 'Left', 'Back'];
const FACE_COLORS = ['Green', 'Red', 'White', 'Yellow', 'Orange', 'Blue'];

type FaceKey = typeof FACES[number];

const colorMap: Record<string, string> = {
  white: '#f5f5f5',
  yellow: '#ffd700',
  red: '#dc2626',
  orange: '#f97316',
  blue: '#2563eb',
  green: '#22c55e',
};

// Simulated color detection from camera
const detectColorsFromImage = (): string[] => {
  const colors = ['white', 'yellow', 'red', 'orange', 'blue', 'green'];
  return Array(9).fill(null).map(() => colors[Math.floor(Math.random() * colors.length)]);
};

const CameraInput = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cubeRef = useRef<RigidCubeHandle>(null);
  
  const [currentFace, setCurrentFace] = useState(0);
  const [scannedFaces, setScannedFaces] = useState<boolean[]>(Array(6).fill(false));
  const [faceColors, setFaceColors] = useState<Record<string, string[]>>({
    front: Array(9).fill('empty'),
    right: Array(9).fill('empty'),
    up: Array(9).fill('empty'),
    down: Array(9).fill('empty'),
    left: Array(9).fill('empty'),
    back: Array(9).fill('empty'),
  });
  
  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Solution state
  const [solution, setSolution] = useState<string[]>([]);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  
  const faceKeyMap: Record<number, string> = {
    0: 'front', 1: 'right', 2: 'up', 3: 'down', 4: 'left', 5: 'back'
  };

  // Request camera permission
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('Unable to access camera. Please grant permission or use manual input.');
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access camera. Try manual input instead.",
      });
    }
  }, [toast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Capture and process face
  const handleCapture = useCallback(() => {
    // Simulate color detection
    const detectedColors = detectColorsFromImage();
    
    const faceKey = faceKeyMap[currentFace];
    setFaceColors(prev => ({
      ...prev,
      [faceKey]: detectedColors
    }));
    
    const newScanned = [...scannedFaces];
    newScanned[currentFace] = true;
    setScannedFaces(newScanned);
    
    toast({
      title: `${FACE_NAMES[currentFace]} Face Captured`,
      description: "Colors detected successfully!",
    });
    
    // Auto-advance to next face
    if (currentFace < 5) {
      setTimeout(() => setCurrentFace(currentFace + 1), 500);
    }
  }, [currentFace, scannedFaces, toast]);

  // Auto-solve when all faces captured
  const handleSolve = useCallback(async () => {
    setIsSolving(true);
    
    try {
      const result = await getSolutionMoves(faceColors);
      
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
        description: "Failed to solve. Please try again.",
      });
    } finally {
      setIsSolving(false);
    }
  }, [faceColors, toast]);

  // Auto-solve when all 6 faces are captured
  useEffect(() => {
    const allCaptured = scannedFaces.every(Boolean);
    if (allCaptured && solution.length === 0 && !isSolving) {
      handleSolve();
    }
  }, [scannedFaces, solution.length, isSolving, handleSolve]);

  // Get animation duration based on speed
  const getAnimationDuration = () => {
    switch (speed) {
      case 'slow': return 800;
      case 'fast': return 250;
      default: return 450;
    }
  };

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
  }, [solution, solutionIndex, isAnimating, speed]);

  // Step back
  const handleStepBack = useCallback(async () => {
    if (!cubeRef.current || isAnimating || solutionIndex <= 0) return;
    
    setIsAnimating(true);
    await cubeRef.current.undoMove();
    setSolutionIndex(prev => prev - 1);
    setIsAnimating(false);
  }, [solutionIndex, isAnimating]);

  // Auto-play effect
  useEffect(() => {
    if (isPlaying && !isAnimating && solutionIndex < solution.length) {
      const timer = setTimeout(() => handleStepForward(), 100);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, isAnimating, solutionIndex, solution.length, handleStepForward]);

  // Reset
  const handleReset = () => {
    setFaceColors({
      front: Array(9).fill('empty'),
      right: Array(9).fill('empty'),
      up: Array(9).fill('empty'),
      down: Array(9).fill('empty'),
      left: Array(9).fill('empty'),
      back: Array(9).fill('empty'),
    });
    setScannedFaces(Array(6).fill(false));
    setCurrentFace(0);
    setSolution([]);
    setSolutionIndex(0);
    setIsPlaying(false);
    cubeRef.current?.reset();
  };

  const completedFaces = scannedFaces.filter(Boolean).length;
  const hasSolution = solution.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
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
          onClick={handleReset}
          className="btn-icon"
          aria-label="Reset"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 px-4 flex flex-col">
        {/* Face indicator bar */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card">
            {FACES.map((face, index) => (
              <button
                key={face}
                onClick={() => setCurrentFace(index)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                  index === currentFace
                    ? 'bg-primary text-primary-foreground'
                    : scannedFaces[index]
                    ? 'bg-green-500/30 text-green-500'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {scannedFaces[index] ? <CheckCircle2 className="w-4 h-4" /> : face}
              </button>
            ))}
          </div>
        </div>

        {/* Camera / Cube View */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
          {!hasSolution ? (
            <>
              {/* Camera View */}
              <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-secondary mb-4">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">{cameraError}</p>
                    <button 
                      onClick={startCamera}
                      className="btn-secondary px-4 py-2"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
                
                {/* Scan overlay grid */}
                {cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-2 border-primary rounded-xl p-2">
                      <div className="grid grid-cols-3 gap-1 w-full h-full">
                        {Array(9).fill(null).map((_, i) => (
                          <div 
                            key={i} 
                            className="border border-primary/50 rounded-lg"
                            style={scannedFaces[currentFace] && faceColors[faceKeyMap[currentFace]][i] !== 'empty' ? {
                              backgroundColor: colorMap[faceColors[faceKeyMap[currentFace]][i]] || 'transparent'
                            } : {}}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Corner brackets */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72">
                      <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-xl" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-xl" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-xl" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-xl" />
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-center mb-6">
                <div className="inline-block px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold mb-3">
                  Step {currentFace + 1}/6: {FACE_NAMES[currentFace]} Face
                </div>
                <p className="text-muted-foreground text-sm">
                  Center the {FACE_COLORS[currentFace]} center sticker in the grid
                </p>
              </div>

              {/* Capture Button */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  onClick={() => navigate('/manual-input')}
                  className="btn-icon w-14 h-14 bg-secondary"
                  aria-label="Manual input"
                >
                  <Pencil className="w-6 h-6" />
                </button>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCapture}
                  disabled={!cameraActive}
                  className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg disabled:opacity-50"
                  style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.5)' }}
                >
                  <Camera className="w-8 h-8" />
                </motion.button>
                
                <div className="w-14 h-14" /> {/* Spacer for symmetry */}
              </div>
            </>
          ) : (
            <>
              {/* 3D Cube with solution */}
              <Suspense fallback={
                <div className="w-64 h-64 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              }>
                <RigidCube3D ref={cubeRef} size={260} />
              </Suspense>

              {/* Solution info */}
              <div className="glass-card mt-4 w-full max-w-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground uppercase">
                    Solution: {solution.length} moves
                  </span>
                  <span className="text-sm font-mono">
                    Step {solutionIndex} / {solution.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {solution.slice(0, 15).map((move, i) => (
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
                  {solution.length > 15 && <span className="text-muted-foreground">...</span>}
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-3 mt-6">
                {/* Speed selector */}
                <button
                  onClick={() => setSpeed(s => s === 'slow' ? 'normal' : s === 'normal' ? 'fast' : 'slow')}
                  className="btn-icon w-12 h-12 bg-secondary"
                >
                  <Gauge className="w-5 h-5" />
                </button>

                <button
                  onClick={handleStepBack}
                  disabled={solutionIndex <= 0 || isAnimating}
                  className="btn-icon w-12 h-12 bg-secondary disabled:opacity-50"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={solutionIndex >= solution.length}
                  className="btn-primary w-16 h-16 rounded-full flex items-center justify-center disabled:opacity-50"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>

                <button
                  onClick={handleStepForward}
                  disabled={solutionIndex >= solution.length || isAnimating}
                  className="btn-icon w-12 h-12 bg-secondary disabled:opacity-50"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                <button
                  onClick={handleReset}
                  className="btn-icon w-12 h-12 bg-secondary"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>

              {/* Speed indicator */}
              <div className="mt-3 text-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Speed: {speed}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Solve button (before all faces captured) */}
        {!hasSolution && (
          <button
            onClick={handleSolve}
            disabled={completedFaces < 6 || isSolving}
            className="btn-primary w-full h-14 flex items-center justify-center gap-2 disabled:opacity-50 mb-4"
          >
            {isSolving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Solving...
              </>
            ) : (
              <>
                <Puzzle className="w-5 h-5" />
                Solve Cube ({completedFaces}/6)
              </>
            )}
          </button>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default CameraInput;
