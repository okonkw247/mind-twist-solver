/**
 * CubeProvider — App-level React context for CubeModel + AnimationController
 *
 * Guarantees:
 *  - CubeModel instance persists across route changes (useRef)
 *  - AnimationController wraps the same CubeModel instance
 *  - Minimal React re-renders: only `version` counter bumps on state changes
 *  - Pages consume cube via useCubeContext() — never create their own
 */

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { CubeModel, type FaceName, type Cubie, type Vec3, type Mat3 } from '@/cube/CubeModel';
import {
  AnimationController,
  type AnimationFrame,
  type SpeedPreset,
} from '@/cube/AnimationController';

// ── Context shape ────────────────────────────────────────────────────────────

export interface CubeContextValue {
  /** Read-only snapshot of cubies — triggers re-render only on version bump */
  cubies: readonly Cubie[];
  /** Incremented after every logical state change */
  version: number;
  /** Current animation frame data (null if idle) */
  animFrame: AnimationFrame | null;
  /** Is the controller currently animating? */
  isAnimating: boolean;
  /** Is the controller paused? */
  isPaused: boolean;
  /** Move history */
  moveHistory: readonly string[];

  // ── Commands ──
  /** Enqueue moves (space-separated or array) — animated */
  enqueue: (moves: string | string[]) => void;
  /** Execute a single move and return a promise */
  executeSingle: (move: string) => Promise<void>;
  /** Undo last move (animated) */
  undo: () => Promise<void>;
  /** Reset cube to solved */
  reset: () => void;
  /** Pause animation */
  pause: () => void;
  /** Resume animation */
  resume: () => void;
  /** Cancel all queued moves */
  cancel: () => void;
  /** Change animation speed */
  setSpeed: (preset: SpeedPreset) => void;
  /** Get current speed */
  getSpeed: () => SpeedPreset;
  /** Get face arrays for solver compatibility */
  getFaceArrays: () => Record<string, string[]>;
  /** Get facelet string for cubejs */
  getFaceletString: () => string;
  /** Check if solved */
  isSolved: () => boolean;
  /** Get cubies in a layer (for renderer) */
  getCubiesInLayer: (face: FaceName) => Cubie[];
  /** Direct access to the model (for advanced use) */
  model: CubeModel;
}

const CubeContext = createContext<CubeContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function CubeProvider({ children }: { children: ReactNode }) {
  // Persistent refs — survive route changes
  const modelRef = useRef<CubeModel>(new CubeModel());
  const controllerRef = useRef<AnimationController>(
    new AnimationController(modelRef.current)
  );

  // Minimal reactive state
  const [version, setVersion] = useState(0);
  const [animFrame, setAnimFrame] = useState<AnimationFrame | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Wire callbacks once
  useEffect(() => {
    const ctrl = controllerRef.current;

    ctrl.setCallbacks({
      onFrame: (frame) => {
        setAnimFrame(frame);
        setIsAnimating(true);
      },
      onMoveComplete: () => {
        setAnimFrame(null);
        // Bump version so consumers re-read cubies
        setVersion((v) => v + 1);
      },
      onQueueComplete: () => {
        setIsAnimating(false);
        setAnimFrame(null);
      },
    });

    return () => {
      ctrl.destroy();
    };
  }, []);

  // ── Commands ─────────────────────────────────────────────────────────────

  const enqueue = useCallback((moves: string | string[]) => {
    controllerRef.current.enqueue(moves);
  }, []);

  const executeSingle = useCallback((move: string) => {
    return controllerRef.current.executeSingle(move);
  }, []);

  const undo = useCallback(async () => {
    const model = modelRef.current;
    const history = model.moveHistory;
    if (history.length === 0) return;

    // Get inverse of last move
    const last = history[history.length - 1];
    const face = last[0];
    let inverse: string;
    if (last.includes("'")) inverse = face;
    else if (last.includes('2')) inverse = last;
    else inverse = face + "'";

    // Undo in model first (pops history), then animate inverse visually
    // Actually: AnimationController.enqueue will call model.applyMove on completion.
    // So we need to undo in model AFTER the animation. 
    // Better approach: undo from model, then animate the inverse without applying to model again.
    
    // The AnimationController applies moves to the model on completion.
    // For undo, we need to: 
    //  1. Pop from model history and apply inverse (logical)
    //  2. Animate the inverse (visual only)
    // But the controller will try to applyMove again...
    
    // Simplest correct approach: undo in model, bump version, animate visually.
    // We can't easily skip the controller's applyMove. So instead:
    // Apply inverse via controller normally. The model will have the move applied twice
    // (once as undo, once by controller). So DON'T undo in model — let controller do it.
    
    // But controller applies the FORWARD move. We need the inverse.
    // Solution: just enqueue the inverse notation. Controller will apply it to model.
    // Model history will have [..., original, inverse] which is correct (they cancel out).
    // If we want clean history, we manually pop both after.
    
    return new Promise<void>((resolve) => {
      const prevOnComplete = controllerRef.current['callbacks'].onMoveComplete;
      const originalCallbacks = { ...controllerRef.current['callbacks'] };
      
      controllerRef.current.setCallbacks({
        ...originalCallbacks,
        onMoveComplete: (move, remaining) => {
          // Pop both the inverse and original from history
          const hist = modelRef.current.moveHistory as string[];
          if (hist.length >= 2) {
            hist.pop(); // remove inverse
            hist.pop(); // remove original
          }
          originalCallbacks.onMoveComplete?.(move, remaining);
          // Restore callbacks
          controllerRef.current.setCallbacks(originalCallbacks);
          resolve();
        },
      });

      controllerRef.current.enqueue(inverse);
    });
  }, []);

  const reset = useCallback(() => {
    controllerRef.current.cancel();
    modelRef.current.reset();
    setVersion((v) => v + 1);
    setAnimFrame(null);
    setIsAnimating(false);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    controllerRef.current.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    controllerRef.current.resume();
    setIsPaused(false);
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current.cancel();
    setVersion((v) => v + 1);
    setAnimFrame(null);
    setIsAnimating(false);
  }, []);

  const setSpeed = useCallback((preset: SpeedPreset) => {
    controllerRef.current.setSpeed(preset);
  }, []);

  const getSpeed = useCallback(() => {
    return controllerRef.current.getSpeed();
  }, []);

  const getFaceArrays = useCallback(() => {
    return modelRef.current.toFaceArrays();
  }, []);

  const getFaceletString = useCallback(() => {
    return modelRef.current.toFaceletString();
  }, []);

  const isSolved = useCallback(() => {
    return modelRef.current.isSolved();
  }, []);

  const getCubiesInLayer = useCallback((face: FaceName) => {
    return modelRef.current.getCubiesInLayer(face);
  }, []);

  // ── Memoized value ───────────────────────────────────────────────────────

  const value = useMemo<CubeContextValue>(
    () => ({
      cubies: modelRef.current.cubies,
      version,
      animFrame,
      isAnimating,
      isPaused,
      moveHistory: modelRef.current.moveHistory,
      enqueue,
      executeSingle,
      undo,
      reset,
      pause,
      resume,
      cancel,
      setSpeed,
      getSpeed,
      getFaceArrays,
      getFaceletString,
      isSolved,
      getCubiesInLayer,
      model: modelRef.current,
    }),
    [
      version,
      animFrame,
      isAnimating,
      isPaused,
      enqueue,
      executeSingle,
      undo,
      reset,
      pause,
      resume,
      cancel,
      setSpeed,
      getSpeed,
      getFaceArrays,
      getFaceletString,
      isSolved,
      getCubiesInLayer,
    ]
  );

  return <CubeContext.Provider value={value}>{children}</CubeContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCubeContext(): CubeContextValue {
  const ctx = useContext(CubeContext);
  if (!ctx) {
    throw new Error('useCubeContext must be used within a <CubeProvider>');
  }
  return ctx;
}
