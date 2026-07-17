import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Keyboard, RotateCcw, Camera as CameraIcon } from 'lucide-react';
import { useCubeState } from '@/hooks/useCubeState';
import { getSolutionMoves } from '@/lib/kociembaSolver';
import { useToast } from '@/hooks/use-toast';

const REFERENCE_RGB: Record<string, [number, number, number]> = {
  white: [242, 242, 242],
  yellow: [255, 204, 0],
  orange: [255, 128, 0],
  red: [235, 19, 19],
  green: [23, 201, 105],
  blue: [0, 85, 255],
};

const CUBE_COLORS = [
  { name: 'white', hex: 'hsl(0, 0%, 95%)' },
  { name: 'yellow', hex: 'hsl(48, 100%, 50%)' },
  { name: 'orange', hex: 'hsl(30, 100%, 50%)' },
  { name: 'red', hex: 'hsl(0, 85%, 50%)' },
  { name: 'green', hex: 'hsl(140, 80%, 45%)' },
  { name: 'blue', hex: 'hsl(220, 100%, 50%)' },
];

function classifyColor(r: number, g: number, b: number): string {
  let best = 'white';
  let bestDist = Infinity;
  for (const [name, [rr, gg, bb]] of Object.entries(REFERENCE_RGB)) {
    const dist = (r - rr) ** 2 + (g - gg) ** 2 + (b - bb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  return best;
}

function gridSamplePoints(): [number, number][] {
  const pts: [number, number][] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      pts.push([(col + 0.5) / 3, (row + 0.5) / 3]);
    }
  }
  return pts;
}

const CameraInput = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string[] | null>(null);
  const [isSolving, setIsSolving] = useState(false);

  const {
    cubeState,
    currentFaceIndex,
    currentFaceLabel,
    setSticker,
    nextFace,
    isCubeComplete,
    faceOrder,
  } = useCubeState(3);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch (err) {
        setCameraError(
          err instanceof Error ? err.message : 'Could not access camera — check permissions'
        );
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);

    const colors = gridSamplePoints().map(([fx, fy]) => {
      const px = Math.floor(fx * size);
      const py = Math.floor(fy * size);
      const { data } = ctx.getImageData(px, py, 1, 1);
      return classifyColor(data[0], data[1], data[2]);
    });

    setDetected(colors);
  }, [cameraReady]);

  const handleCorrectSticker = (index: number, color: string) => {
    setDetected((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = color;
      return next;
    });
  };

  const handleConfirmFace = () => {
    if (!detected) return;
    detected.forEach((color, i) => setSticker(currentFaceIndex, i, color));
    setDetected(null);

    if (currentFaceIndex < faceOrder.length - 1) {
      nextFace();
    } else {
      toast({ title: 'All faces scanned', description: 'Ready to solve' });
    }
  };

  const handleRetake = () => setDetected(null);

  const handleSolve = async () => {
    setIsSolving(true);
    try {
      const result = await getSolutionMoves(cubeState);
      if (result.success && result.moves) {
        navigate('/solution', {
          state: { solution: result.moves, moveCount: result.moves.length, cubeState },
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid Cube State',
          description: result.error || 'Please check the scanned colors',
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to solve cube' });
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button onClick={() => navigate(-1)} className="btn-icon" aria-label="Go back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-wider">Camera Scan</h1>
        <button onClick={() => navigate('/manual-input')} className="btn-icon" aria-label="Manual input">
          <Keyboard className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 px-4 flex flex-col">
        <div className="mb-4 text-center">
          <h2 className="text-lg font-semibold uppercase tracking-wide">{currentFaceLabel}</h2>
          <p className="text-sm text-muted-foreground">Face {currentFaceIndex + 1} of 6</p>
        </div>

        {cameraError && (
          <div className="bg-destructive/10 text-destructive rounded-xl p-4 mb-4 text-sm text-center">
            {cameraError} — you can still use manual input instead.
          </div>
        )}

        {!detected && (
          <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black mb-6">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {Array(9).fill(null).map((_, i) => (
                <div key={i} className="border border-white/40" />
              ))}
            </div>
          </div>
        )}

        {detected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-72 h-72 bg-card rounded-2xl p-4 mx-auto mb-6"
          >
            <div className="grid grid-cols-3 gap-2 w-full h-full">
              {detected.map((color, index) => {
                const colorData = CUBE_COLORS.find((c) => c.name === color);
                return (
                  <button
                    key={index}
                    onClick={() => {
                      const currentIdx = CUBE_COLORS.findIndex((c) => c.name === color);
                      const nextColor = CUBE_COLORS[(currentIdx + 1) % CUBE_COLORS.length].name;
                      handleCorrectSticker(index, nextColor);
                    }}
                    className="rounded-xl shadow-lg"
                    style={{ backgroundColor: colorData?.hex }}
                    title="Tap to cycle if this looks wrong"
                  />
                );
              })}
            </div>
          </motion.div>
        )}

        <p className="text-center text-muted-foreground text-sm mb-6">
          {detected
            ? 'Tap any square to correct a misread color, then confirm'
            : 'Line up the face inside the grid and capture'}
        </p>

        <div className="flex gap-3 mb-4">
          {!detected ? (
            <button
              onClick={handleCapture}
              disabled={!cameraReady}
              className="btn-primary flex-1 flex items-center justify-center gap-2 h-14 disabled:opacity-50"
            >
              <CameraIcon className="w-5 h-5" />
              Capture Face
            </button>
          ) : (
            <>
              <button
                onClick={handleRetake}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 h-14"
              >
                <RotateCcw className="w-5 h-5" />
                Retake
              </button>
              <button
                onClick={handleConfirmFace}
                className="btn-primary flex-1 flex items-center justify-center gap-2 h-14"
              >
                <Check className="w-5 h-5" />
                Confirm Face
              </button>
            </>
          )}
        </div>

        {isCubeComplete && !detected && (
          <button
            onClick={handleSolve}
            disabled={isSolving}
            className="btn-primary w-full h-14 mb-6 disabled:opacity-50"
          >
            {isSolving ? 'Solving...' : 'Solve Cube'}
          </button>
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraInput;
