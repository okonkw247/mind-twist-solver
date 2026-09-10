import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MoreVertical,
  Camera,
  AlertTriangle,
  Pencil,
  Flashlight,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { classifyFaceDetailed, type ColorName, type FaceClassification } from '@/lib/colorClassifier';
import CameraTipsSheet, { shouldShowCameraTips } from '@/components/CameraTipsSheet';
import LiveSwatchStrip from '@/components/LiveSwatchStrip';

const FACES = ['F', 'R', 'U', 'D', 'L', 'B'] as const;
const FACE_NAMES = ['Front', 'Right', 'Up', 'Down', 'Left', 'Back'] as const;
const EXPECTED_CENTERS: ColorName[] = ['green', 'red', 'white', 'yellow', 'orange', 'blue'];

type ScanState = 'scanning' | 'complete' | 'invalid';

function validateCapturedFaces(faces: ColorName[][]): string | null {
  const counts: Record<ColorName, number> = {
    white: 0,
    yellow: 0,
    red: 0,
    orange: 0,
    blue: 0,
    green: 0,
  };

  faces.forEach((face) => face.forEach((color) => { counts[color] += 1; }));
  const missingOrExtra = (Object.entries(counts) as [ColorName, number][])
    .filter(([, count]) => count !== 9);
  if (missingOrExtra.length > 0) {
    return `Color balance is off: ${missingOrExtra.map(([color, count]) => `${color} ${count}/9`).join(', ')}.`;
  }

  const wrongCenter = faces.findIndex((face, index) => face[4] !== EXPECTED_CENTERS[index]);
  if (wrongCenter >= 0) {
    return `The ${FACE_NAMES[wrongCenter]} center looks ${faces[wrongCenter][4]}. Rescan that face with the cube orientation guide. `;
  }

  return null;
}

const CameraInput = () => {
  const navigate = useNavigate();
  const camera = useCamera({ autoStart: false, facingMode: 'environment' });

  const [currentFace, setCurrentFace] = useState(0);
  const [faceColors, setFaceColors] = useState<ColorName[][]>(
    Array(6).fill(null).map(() => []),
  );
  const [liveResult, setLiveResult] = useState<FaceClassification | null>(null);
  const [stableFrames, setStableFrames] = useState(0);
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [scanError, setScanError] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);

  const completedFaces = faceColors.filter((f) => f.length === 9).length;
  const isCaptureReady = Boolean(liveResult?.readable && stableFrames >= 3);
  const solveTimer = useRef<number | null>(null);
  const lastSignature = useRef<string | null>(null);
  const stableFrameCount = useRef(0);

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
          const result = classifyFaceDetailed(img);
          const signature = result.colors.join(',');
          if (signature === lastSignature.current) {
            stableFrameCount.current += 1;
          } else {
            lastSignature.current = signature;
            stableFrameCount.current = 1;
          }
          setStableFrames(Math.min(stableFrameCount.current, 5));
          setLiveResult(result);
        } catch {
          lastSignature.current = null;
          stableFrameCount.current = 0;
          setStableFrames(0);
          setLiveResult(null);
        }
      }
      liveTimer.current = window.setTimeout(tick, 220);
    };
    tick();
    return () => {
      if (liveTimer.current) window.clearTimeout(liveTimer.current);
      liveTimer.current = null;
    };
  }, [camera.status, camera.capture]);

  const finishScan = useCallback((faces: ColorName[][]) => {
    const error = validateCapturedFaces(faces);
    if (error) {
      setScanState('invalid');
      setScanError(error);
      return;
    }

    camera.stop();
    const [F, R, U, D, L, B] = faces;
    const cubeState: Record<string, string[]> = {
      up: U, right: R, front: F, down: D, left: L, back: B,
    };
    solveTimer.current = window.setTimeout(() => {
      navigate('/solution', { state: { cubeState, faceColors: faces, source: 'camera' } });
    }, 450);
  }, [camera, navigate]);

  const handleScan = useCallback(() => {
    const image = camera.capture();
    if (!image || !liveResult?.readable || stableFrames < 3) return;

    const colors = liveResult.colors;
    const nextFaces = faceColors.map((face, index) => index === currentFace ? [...colors] : [...face]);
    setFaceColors(nextFaces);
    setScanError(null);
    setScanState('scanning');
    setLiveResult(null);
    setStableFrames(0);
    lastSignature.current = null;
    stableFrameCount.current = 0;

    if (currentFace < 5) {
      setCurrentFace((face) => Math.min(5, face + 1));
    } else {
      setScanState('complete');
      finishScan(nextFaces);
    }
  }, [camera, currentFace, faceColors, finishScan, liveResult, stableFrames]);

  const handleSolveNow = useCallback(() => {
    if (completedFaces !== 6) return;
    finishScan(faceColors);
  }, [completedFaces, faceColors, finishScan]);

  useEffect(() => () => {
    camera.stop();
    if (solveTimer.current) window.clearTimeout(solveTimer.current);
  }, [camera.stop]);

  const handleRescan = () => {
    setFaceColors((prev) => prev.map((face, index) => index === currentFace ? [] : face));
    setScanError(null);
    setScanState('scanning');
    setLiveResult(null);
    setStableFrames(0);
  };

  const liveColors = liveResult?.colors ?? null;

  /*
   * The captured array is intentionally copied before state updates. The final
   * face must be included in the solver handoff, even though React updates are
   * asynchronous.
   */
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const _legacyFaceStateGuard = faceColors;

  /* Previous implementation kept this state update inline; leave no stale
   * closure around the scan flow. */
  /*
    setFaceColors((prev) => {
      const next = prev.map((f) => [...f]);
      next[currentFace] = colors;
      return next;
    });
  */

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Full-bleed video */}
      <video
        ref={camera.videoRef}
        playsInline
        autoPlay
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
          camera.status === 'ready' || camera.hasStream ? 'opacity-100' : 'opacity-0'
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
          <div className="relative grid grid-cols-3 grid-rows-3 w-[78vw] max-w-[340px] aspect-square">
          {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`border transition-colors ${
                  liveResult?.readable ? 'border-primary/90' : 'border-white/80'
                }`}
              />
          ))}
            <div className="pointer-events-none absolute inset-0 border-2 border-primary/80 shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_0_24px_hsl(var(--primary)/0.45)]" />
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

        <p className="mt-3 text-white text-sm font-medium drop-shadow text-center">
          {scanState === 'complete' ? 'All faces captured — preparing your solution' : `Step ${currentFace + 1} / 6 — ${FACE_NAMES[currentFace]} face`}
        </p>
        <div className="mt-3 flex items-center gap-1.5" aria-label={`${completedFaces} of 6 faces captured`}>
          {FACES.map((face, index) => {
            const complete = faceColors[index].length === 9;
            const active = index === currentFace;
            return (
              <button
                key={face}
                type="button"
                onClick={() => setCurrentFace(index)}
                aria-label={`${FACE_NAMES[index]} face${complete ? ', captured' : ''}`}
                className={`flex h-8 min-w-8 items-center justify-center gap-1 rounded-full px-2 text-[11px] font-bold transition-colors ${
                  complete ? 'bg-primary text-primary-foreground' : active ? 'bg-white text-black' : 'bg-white/20 text-white'
                }`}
              >
                {complete ? <Check className="h-3.5 w-3.5" /> : face}
              </button>
            );
          })}
        </div>
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

      {camera.status === 'ready' && (
        <div className="absolute right-4 top-20 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void camera.toggleTorch()}
            disabled={!camera.torchSupported}
            className="btn-icon bg-black/45 text-white disabled:opacity-40"
            aria-label={camera.torchOn ? 'Turn light off' : 'Turn light on'}
            title={camera.torchSupported ? 'Toggle camera light' : 'Camera light unavailable'}
          >
            <Flashlight className={`h-5 w-5 ${camera.torchOn ? 'text-primary' : ''}`} />
          </button>
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
            <div className="flex flex-col items-center gap-2">
              <LiveSwatchStrip colors={liveColors} readable={Boolean(liveResult?.readable)} />
              <p className="text-center text-xs text-white/80">
                {camera.status !== 'ready'
                  ? 'Camera is off'
                  : liveResult?.readable
                    ? stableFrames >= 3 ? 'Stable colors — ready to capture' : 'Hold still… confirming colors'
                    : 'Move the cube into the grid and improve the light'}
              </p>
            </div>
          </div>
          <div className="w-10 flex justify-end">
            {completedFaces > 0 && (
              <button type="button" onClick={handleRescan} className="btn-icon text-white" aria-label="Rescan current face">
                <RotateCcw className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {scanError && (
          <div className="mb-3 rounded-xl border border-destructive/50 bg-destructive/15 px-3 py-2 text-center text-xs text-white">
            {scanError}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={completedFaces === 6 ? handleSolveNow : handleScan}
          disabled={camera.status !== 'ready' || (completedFaces < 6 && !isCaptureReady) || scanState === 'complete'}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg uppercase tracking-widest disabled:opacity-40"
        >
          {completedFaces === 6 ? 'Analyze & Solve' : isCaptureReady ? `Capture ${FACE_NAMES[currentFace]}` : 'Align cube to capture'}
        </motion.button>

        <p className="text-center text-xs text-white/60 mt-2">
          {completedFaces}/6 faces captured · Center the {FACE_NAMES[currentFace].toLowerCase()} face
        </p>
      </div>

      <CameraTipsSheet
        open={tipsOpen && camera.status !== 'ready'}
        onClose={() => setTipsOpen(false)}
      />
    </div>
  );
};

export default CameraInput;
