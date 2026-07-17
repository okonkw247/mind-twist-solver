import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreVertical, Camera, AlertTriangle, Pencil } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { classifyFace, type ColorName } from '@/lib/colorClassifier';
import CameraTipsSheet, { shouldShowCameraTips } from '@/components/CameraTipsSheet';
import LiveSwatchStrip from '@/components/LiveSwatchStrip';

const FACES = ['F', 'R', 'U', 'D', 'L', 'B'] as const;
const FACE_NAMES = ['Front', 'Right', 'Up', 'Down', 'Left', 'Back'] as const;

const CameraInput = () => {
  const navigate = useNavigate();
  const camera = useCamera({ autoStart: false, facingMode: 'environment' });

  const [currentFace, setCurrentFace] = useState(0);
  const [faceColors, setFaceColors] = useState<ColorName[][]>(
    Array(6).fill(null).map(() => []),
  );
  const [liveColors, setLiveColors] = useState<ColorName[] | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);

  const completedFaces = faceColors.filter((f) => f.length === 9).length;

  // Show tips once per device
  useEffect(() => {
    if (shouldShowCameraTips()) setTipsOpen(true);
  }, []);

  // Live classification @ ~5fps when camera is ready
  const liveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (camera.status !== 'ready') return;
    const tick = () => {
      const img = camera.capture();
      if (img) {
        try {
          setLiveColors(classifyFace(img));
        } catch {
          /* ignore */
        }
      }
      liveTimer.current = window.setTimeout(tick, 220);
    };
    tick();
    return () => {
      if (liveTimer.current) window.clearTimeout(liveTimer.current);
      liveTimer.current = null;
    };
  }, [camera.status, camera]);

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
      setTimeout(() => setCurrentFace((c) => Math.min(5, c + 1)), 250);
    }
  }, [camera, currentFace]);

  useEffect(() => () => camera.stop(), [camera]);

  const goSolve = () => {
    if (completedFaces !== 6) return;
    camera.stop();
    const [F, R, U, D, L, B] = faceColors;
    const cubeState: Record<string, string[]> = {
      up: U, right: R, front: F, down: D, left: L, back: B,
    };
    navigate('/solution', { state: { cubeState, faceColors } });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Full-bleed video */}
      <video
        ref={camera.videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
          camera.status === 'ready' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 safe-top">
        <button onClick={() => navigate(-1)} className="btn-icon text-white" aria-label="Back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => setTipsOpen(true)}
          className="btn-icon text-white"
          aria-label="Tips"
        >
          <MoreVertical className="w-6 h-6" />
        </button>
      </header>

      {/* 3x3 grid overlay */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <div className="grid grid-cols-3 grid-rows-3 w-[78vw] max-w-[340px] aspect-square">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-white/80" />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {FACES.map((f, i) => (
            <button
              key={f}
              onClick={() => setCurrentFace(i)}
              className={`w-8 h-8 rounded-md text-xs font-bold transition-colors ${
                i === currentFace
                  ? 'bg-white text-black'
                  : faceColors[i].length === 9
                  ? 'bg-primary/80 text-white'
                  : 'bg-white/20 text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <p className="mt-3 text-white text-sm font-medium drop-shadow">
          Step {currentFace + 1} / 6 — {FACE_NAMES[currentFace]} face
        </p>
      </div>

      {/* Permission / idle overlay */}
      {camera.status !== 'ready' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 p-8 text-center text-white">
          {camera.status === 'idle' && (
            <>
              <Camera className="w-10 h-10 mb-4 text-primary" />
              <h2 className="text-lg font-bold mb-2">Enable your camera</h2>
              <p className="text-sm text-white/70 mb-6 max-w-xs">
                We&apos;ll ask your browser for camera access so you can scan your cube
                in real time.
              </p>
              <button
                onClick={() => void camera.start()}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
              >
                Enable Camera
              </button>
              <button
                onClick={() => navigate('/manual-input')}
                className="mt-4 text-xs text-white/70 underline"
              >
                or enter colors manually
              </button>
            </>
          )}
          {camera.status === 'requesting' && (
            <>
              <div className="w-10 h-10 border-4 border-primary/40 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-sm text-white/80">Requesting camera…</p>
            </>
          )}
          {camera.status === 'denied' && (
            <>
              <AlertTriangle className="w-8 h-8 text-destructive mb-3" />
              <p className="text-sm mb-2">Camera permission denied</p>
              <p className="text-xs text-white/70 mb-4 max-w-xs">
                Allow camera access in your browser settings, then retry.
              </p>
              <div className="flex gap-3">
                <button onClick={() => void camera.start()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
                  Retry
                </button>
                <button
                  onClick={() => navigate('/manual-input')}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm"
                >
                  Manual input
                </button>
              </div>
            </>
          )}
          {(camera.status === 'unavailable' || camera.status === 'error') && (
            <>
              <AlertTriangle className="w-8 h-8 text-destructive mb-3" />
              <p className="text-sm mb-4">{camera.error || 'Camera unavailable'}</p>
              <button
                onClick={() => navigate('/manual-input')}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
              >
                Use manual input
              </button>
            </>
          )}
        </div>
      )}

      {/* Bottom controls */}
      <div className="relative z-10 px-4 pb-6 safe-bottom bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            onClick={() => navigate('/manual-input')}
            className="btn-icon text-white"
            aria-label="Manual edit"
          >
            <Pencil className="w-5 h-5" />
          </button>

          <div className="flex-1 flex justify-center">
            <LiveSwatchStrip colors={liveColors} />
          </div>

          <div className="w-10" />
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={completedFaces === 6 ? goSolve : handleScan}
          disabled={camera.status !== 'ready'}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg uppercase tracking-widest disabled:opacity-40"
        >
          {completedFaces === 6 ? 'Solve' : 'Scan'}
        </motion.button>

        <p className="text-center text-xs text-white/60 mt-2">
          Captured {completedFaces}/6 faces
        </p>
      </div>

      <CameraTipsSheet open={tipsOpen} onClose={() => setTipsOpen(false)} />
    </div>
  );
};

export default CameraInput;
