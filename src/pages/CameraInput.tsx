import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Camera, Pencil, Settings, AlertTriangle } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { classifyFace, type ColorName } from '@/lib/colorClassifier';

const FACES = ['F', 'R', 'U', 'D', 'L', 'B'] as const;
const FACE_NAMES = ['Front', 'Right', 'Up', 'Down', 'Left', 'Back'] as const;
const FACE_COLORS = ['White', 'Blue', 'Yellow', 'Green', 'Orange', 'Red'] as const;

const COLOR_MAP: Record<ColorName, string> = {
  white: 'hsl(0, 0%, 95%)',
  yellow: 'hsl(48, 100%, 50%)',
  red: 'hsl(0, 85%, 50%)',
  orange: 'hsl(30, 100%, 50%)',
  blue: 'hsl(220, 100%, 50%)',
  green: 'hsl(140, 80%, 45%)',
};

const CameraInput = () => {
  const navigate = useNavigate();
  const camera = useCamera({ autoStart: true, facingMode: 'environment' });

  const [currentFace, setCurrentFace] = useState(0);
  const [faceColors, setFaceColors] = useState<ColorName[][]>(
    Array(6).fill(null).map(() => [])
  );

  const completedFaces = faceColors.filter((f) => f.length === 9).length;

  const handleScan = useCallback(() => {
    const image = camera.capture();
    if (!image) return;
    const colors = classifyFace(image);
    setFaceColors((prev) => {
      const next = prev.map((f) => [...f]);
      next[currentFace] = colors;
      return next;
    });
    if (currentFace < 5) {
      setTimeout(() => setCurrentFace((c) => Math.min(5, c + 1)), 350);
    }
  }, [camera, currentFace]);

  const handleClear = useCallback(() => {
    setFaceColors(Array(6).fill(null).map(() => []));
    setCurrentFace(0);
  }, []);

  // Stop camera when navigating away (covered by hook unmount, but explicit on solve)
  useEffect(() => () => camera.stop(), [camera]);

  const currentColors = faceColors[currentFace];
  const showVideo = camera.status === 'ready' && currentColors.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button onClick={() => navigate(-1)} className="btn-icon" aria-label="Back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-wider">AR Solver</h1>
        <button onClick={handleClear} className="btn-icon" aria-label="Clear">
          <Trash2 className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 px-4 flex flex-col">
        {/* Face indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card">
            {FACES.map((face, i) => (
              <button
                key={face}
                onClick={() => setCurrentFace(i)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                  i === currentFace
                    ? 'bg-foreground text-background'
                    : faceColors[i].length === 9
                    ? 'bg-primary/30 text-primary'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {face}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wide">
            Step {currentFace + 1}/6: {FACE_NAMES[currentFace]} Face
          </div>

          {/* Camera viewport with 3x3 overlay */}
          <div
            className="relative w-72 h-72 border-2 border-primary rounded-2xl mt-12 mb-8 overflow-hidden bg-secondary/50"
            style={{
              boxShadow: '0 0 30px hsl(var(--primary) / 0.3)',
            }}
          >
            {/* Live video background */}
            <video
              ref={camera.videoRef}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                showVideo ? 'opacity-100' : 'opacity-0'
              }`}
              playsInline
              muted
            />

            {/* Camera state messages */}
            {camera.status !== 'ready' && currentColors.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                {camera.status === 'requesting' && (
                  <>
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Requesting camera…</p>
                  </>
                )}
                {camera.status === 'denied' && (
                  <>
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                    <p className="text-sm">Camera permission denied</p>
                    <button onClick={camera.start} className="btn-secondary px-4 py-2 text-sm">
                      Retry
                    </button>
                  </>
                )}
                {(camera.status === 'unavailable' || camera.status === 'error') && (
                  <>
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                    <p className="text-sm">{camera.error || 'Camera unavailable'}</p>
                    <button
                      onClick={() => navigate('/manual-input')}
                      className="btn-secondary px-4 py-2 text-sm"
                    >
                      Use manual input
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Captured face preview */}
            {currentColors.length === 9 && (
              <div className="absolute inset-0 grid grid-cols-3 gap-2 p-4">
                {currentColors.map((color, i) => (
                  <div
                    key={i}
                    className="rounded-xl border-2 border-transparent"
                    style={{ backgroundColor: COLOR_MAP[color] }}
                  />
                ))}
              </div>
            )}

            {/* Corner guides */}
            <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-primary rounded-tl-xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-primary rounded-tr-xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-primary rounded-bl-xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-primary rounded-br-xl pointer-events-none" />

            {/* 3x3 alignment grid overlay (only while live) */}
            {showVideo && (
              <div className="absolute inset-4 grid grid-cols-3 grid-rows-3 pointer-events-none">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-primary/60 rounded-md" />
                ))}
              </div>
            )}
          </div>

          <div className="text-center px-6 mb-8">
            <h2 className="text-2xl font-bold mb-2">
              Scan the {FACE_NAMES[currentFace]} ({FACE_COLORS[currentFace]}) face
            </h2>
            <p className="text-muted-foreground">
              Center the {FACE_COLORS[currentFace].toLowerCase()} middle sticker in the grid and hold steady
            </p>
          </div>
        </div>

        <div className="pb-8 safe-bottom">
          <div className="flex justify-center items-center gap-6 mb-6">
            <button
              onClick={() => {
                const next = faceColors.map((f) => [...f]);
                next[currentFace] = [];
                setFaceColors(next);
              }}
              className="btn-icon w-14 h-14 bg-secondary"
              aria-label="Rescan this face"
              disabled={currentColors.length === 0}
            >
              <Trash2 className="w-6 h-6" />
            </button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleScan}
              disabled={camera.status !== 'ready'}
              className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg disabled:opacity-50"
              style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.5)' }}
              aria-label="Capture face"
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

          <button
            onClick={() => {
              if (completedFaces !== 6) return;
              camera.stop();
              // FACES order during capture: [F, R, U, D, L, B]
              // Kociemba/solver state keys: up, right, front, down, left, back
              const [F, R, U, D, L, B] = faceColors;
              const cubeState: Record<string, string[]> = {
                up: U, right: R, front: F, down: D, left: L, back: B,
              };
              navigate('/solution', { state: { cubeState, faceColors } });
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
