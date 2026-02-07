import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertCircle,
  Pencil,
  RefreshCw,
  Gauge
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import RigidCube3D, { RigidCubeHandle } from '@/components/RigidCube3D';
import { getSolutionMoves } from '@/lib/kociembaSolver';
import { captureGridColors, CubeColor, COLOR_HEX_MAP, DetectionResult } from '@/lib/colorDetection';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

const FACES = ['F', 'R', 'U', 'D', 'L', 'B'] as const;
const FACE_NAMES = ['Front', 'Right', 'Up', 'Down', 'Left', 'Back'];
const FACE_COLORS = ['Green', 'Red', 'White', 'Yellow', 'Orange', 'Blue'];

const faceKeyMap: Record<number, string> = {
  0: 'front', 1: 'right', 2: 'up', 3: 'down', 4: 'left', 5: 'back'
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
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  
  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Solution state
  const [solution, setSolution] = useState<string[]>([]);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

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
        await videoRef.current.play();
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

  // Capture and process face with real color detection
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !cameraActive) return;
    
    setIsCapturing(true);
    
    try {
      // Use real color detection algorithm
      const results = captureGridColors(videoRef.current, 0.15);
      setDetectionResults(results);
      
      // Calculate average confidence
      const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / 9;
      
      // Convert results to color names
      const detectedColors = results.map(r => r.color);
      
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
        description: avgConfidence > 0.7 
          ? "Colors detected with high confidence!" 
          : "Colors detected. Review and adjust if needed.",
      });
      
      // Auto-advance to next face
      if (currentFace < 5) {
        setTimeout(() => setCurrentFace(currentFace + 1), 600);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Detection Failed",
        description: "Could not detect colors. Please try again.",
      });
    } finally {
      setIsCapturing(false);
    }
  }, [currentFace, scannedFaces, cameraActive, toast]);

  // Manual color correction
  const handleColorCorrect = (index: number) => {
    const colors: CubeColor[] = ['white', 'yellow', 'red', 'orange', 'green', 'blue'];
    const faceKey = faceKeyMap[currentFace];
    const currentColor = faceColors[faceKey][index];
    const currentIdx = colors.indexOf(currentColor as CubeColor);
    const nextColor = colors[(currentIdx + 1) % colors.length];
    
    setFaceColors(prev => ({
      ...prev,
      [faceKey]: prev[faceKey].map((c, i) => i === index ? nextColor : c)
    }));
  };

  // Auto-solve when all faces captured
  const handleSolve = useCallback(async () => {
    setIsSolving(true);
    
    try {
      const result = await getSolutionMoves(faceColors);
      
      if (result.success && result.moves) {
        const moveNotations = result.moves.map(m => m.notation);
        setSolution(moveNotations);
        setSolutionIndex(0);
        stopCamera();
        
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
  }, [faceColors, stopCamera, toast]);

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
    setDetectionResults([]);
    cubeRef.current?.reset();
    startCamera();
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
                onClick={() => !hasSolution && setCurrentFace(index)}
                disabled={hasSolution}
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

        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Scanning Progress</span>
            <span className="text-sm text-muted-foreground">{completedFaces}/6 faces</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${(completedFaces / 6) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
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
                
                {/* Scan overlay grid with detected colors */}
                {cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-2 border-primary rounded-xl p-2">
                      <div className="grid grid-cols-3 gap-1 w-full h-full pointer-events-auto">
                        {Array(9).fill(null).map((_, i) => {
                          const faceKey = faceKeyMap[currentFace];
                          const color = faceColors[faceKey][i];
                          const isEmpty = color === 'empty';
                          
                          return (
                            <button
                              key={i}
                              onClick={() => !isEmpty && handleColorCorrect(i)}
                              className={`border-2 rounded-lg transition-all ${
                                isEmpty 
                                  ? 'border-primary/50' 
                                  : 'border-black/30 shadow-md'
                              }`}
                              style={!isEmpty ? {
                                backgroundColor: COLOR_HEX_MAP[color as CubeColor] || 'transparent'
                              } : {}}
                            />
                          );
                        })}
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
                  Center the {FACE_COLORS[currentFace]} face in the grid
                </p>
                {scannedFaces[currentFace] && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Tap colors to correct if needed
                  </p>
                )}
              </div>

              {/* Action Buttons */}
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
                  disabled={!cameraActive || isCapturing}
                  className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg disabled:opacity-50"
                  style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.5)' }}
                >
                  {isCapturing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8" />
                  )}
                </motion.button>
                
                {scannedFaces[currentFace] && currentFace < 5 ? (
                  <button
                    onClick={() => setCurrentFace(currentFace + 1)}
                    className="btn-icon w-14 h-14 bg-primary"
                    aria-label="Next face"
                  >
                    <span className="text-sm font-bold">Next</span>
                  </button>
                ) : completedFaces === 6 ? (
                  <button
                    onClick={handleSolve}
                    disabled={isSolving}
                    className="btn-icon w-14 h-14 bg-primary"
                    aria-label="Solve"
                  >
                    {isSolving ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                  </button>
                ) : (
                  <div className="w-14 h-14" /> // Spacer
                )}
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
                <div className="flex flex-wrap gap-1 justify-center max-h-16 overflow-y-auto">
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
              <div className="flex items-center justify-center gap-3 mt-6">
                {/* Speed selector */}
                <button
                  onClick={() => setSpeed(s => s === 'slow' ? 'normal' : s === 'normal' ? 'fast' : 'slow')}
                  className="btn-icon w-12 h-12 bg-secondary text-xs font-bold"
                >
                  {speed === 'slow' ? '0.5x' : speed === 'fast' ? '2x' : '1x'}
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
      </main>

      <BottomNav />
    </div>
  );
};

export default CameraInput;
