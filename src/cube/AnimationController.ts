/**
 * AnimationController — Stage 3
 *
 * Responsibilities:
 *   1. Queue moves and execute them one-at-a-time.
 *   2. Drive smooth 90° (or 180°) rotations via requestAnimationFrame.
 *   3. Lock out new logical state changes while animating.
 *   4. Notify the consumer (renderer) of per-frame progress AND completion.
 *
 * This module has ZERO dependency on React, Three.js, or the DOM.
 * It only needs `requestAnimationFrame` (browser) or a polyfill (tests).
 */

import { CubeModel, type FaceName } from './CubeModel';

// ── Types ────────────────────────────────────────────────────────────────────

export type MoveNotation = string; // e.g. "R", "U'", "F2"

export interface AnimationFrame {
  /** Which face layer is rotating */
  face: FaceName;
  /** Rotation axis in world space: 'x' | 'y' | 'z' */
  axis: 'x' | 'y' | 'z';
  /** Which layer value (-1 or 1) to select cubies */
  layerValue: number;
  /** Target angle in radians (±π/2 or ±π) */
  targetAngle: number;
  /** Current interpolated angle this frame (0 → targetAngle) */
  currentAngle: number;
  /** 0 → 1 progress */
  progress: number;
}

export interface AnimationCallbacks {
  /** Called every rAF tick with interpolated state */
  onFrame?: (frame: AnimationFrame) => void;
  /** Called once when a single move finishes (logical state already updated) */
  onMoveComplete?: (move: MoveNotation, remaining: number) => void;
  /** Called when entire queue drains */
  onQueueComplete?: () => void;
}

export type SpeedPreset = 'slow' | 'normal' | 'fast' | 'instant';

const SPEED_MS: Record<SpeedPreset, number> = {
  slow: 800,
  normal: 450,
  fast: 250,
  instant: 0,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a single Singmaster token into face + angle */
function parseMoveToken(token: string): { face: FaceName; angle: number } {
  const clean = token.trim();
  if (!clean) throw new Error(`Empty move token`);

  const face = clean[0] as FaceName;
  const validFaces: FaceName[] = ['R', 'L', 'U', 'D', 'F', 'B'];
  if (!validFaces.includes(face)) throw new Error(`Invalid face: ${face}`);

  let angle = Math.PI / 2; // default CW

  if (clean.endsWith("'") || clean.endsWith('\u2019')) {
    angle = -Math.PI / 2; // CCW
  } else if (clean.endsWith('2')) {
    angle = Math.PI; // 180°
  }

  return { face, angle };
}

/** Map face → rotation axis and layer selector */
function faceToAxis(face: FaceName): { axis: 'x' | 'y' | 'z'; layerValue: number; sign: number } {
  switch (face) {
    case 'R': return { axis: 'x', layerValue: 1, sign: -1 };
    case 'L': return { axis: 'x', layerValue: -1, sign: 1 };
    case 'U': return { axis: 'y', layerValue: 1, sign: -1 };
    case 'D': return { axis: 'y', layerValue: -1, sign: 1 };
    case 'F': return { axis: 'z', layerValue: 1, sign: -1 };
    case 'B': return { axis: 'z', layerValue: -1, sign: 1 };
  }
}

/** Ease-out cubic: fast start, smooth landing */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ── Controller ───────────────────────────────────────────────────────────────

export class AnimationController {
  private cube: CubeModel;
  private queue: MoveNotation[] = [];
  private callbacks: AnimationCallbacks = {};
  private speed: SpeedPreset = 'normal';

  // Animation lock
  private _isAnimating = false;
  private rafId: number | null = null;
  private animStart = 0;
  private currentParsed: { face: FaceName; angle: number } | null = null;
  private paused = false;
  private pauseElapsed = 0;

  constructor(cube: CubeModel) {
    this.cube = cube;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  get isAnimating(): boolean {
    return this._isAnimating;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  setCallbacks(cb: AnimationCallbacks): void {
    this.callbacks = cb;
  }

  setSpeed(preset: SpeedPreset): void {
    this.speed = preset;
  }

  getSpeed(): SpeedPreset {
    return this.speed;
  }

  /**
   * Enqueue moves (space-separated Singmaster string or array).
   * Starts draining immediately if idle.
   */
  enqueue(moves: string | MoveNotation[]): void {
    const tokens = typeof moves === 'string'
      ? moves.split(/\s+/).filter(Boolean)
      : moves;

    this.queue.push(...tokens);

    if (!this._isAnimating) {
      this.drainNext();
    }
  }

  /** Execute a single move immediately (still animated). Rejects if busy. */
  executeSingle(move: MoveNotation): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._isAnimating) {
        reject(new Error('Cannot execute move while animating'));
        return;
      }
      const prevOnComplete = this.callbacks.onMoveComplete;
      const wrappedCb: AnimationCallbacks = {
        ...this.callbacks,
        onMoveComplete: (m, r) => {
          prevOnComplete?.(m, r);
          resolve();
        },
      };
      this.callbacks = wrappedCb;
      this.queue.push(move);
      this.drainNext();
    });
  }

  pause(): void {
    if (!this._isAnimating || this.paused) return;
    this.paused = true;
    this.pauseElapsed = performance.now() - this.animStart;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    if (!this.paused || !this.currentParsed) return;
    this.paused = false;
    this.animStart = performance.now() - this.pauseElapsed;
    this.tick();
  }

  /** Cancel everything: clear queue, cancel current animation, leave cube as-is */
  cancel(): void {
    this.queue = [];
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    // If mid-animation, snap the logical move so cube stays consistent
    if (this.currentParsed) {
      this.cube.applyMove(this.currentParsed.face + this.suffixFromAngle(this.currentParsed.angle));
    }
    this.currentParsed = null;
    this._isAnimating = false;
    this.paused = false;
  }

  /** Destroy — call on unmount */
  destroy(): void {
    this.cancel();
    this.callbacks = {};
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private drainNext(): void {
    if (this.queue.length === 0) {
      this._isAnimating = false;
      this.callbacks.onQueueComplete?.();
      return;
    }

    this._isAnimating = true;
    const token = this.queue.shift()!;
    this.currentParsed = parseMoveToken(token);

    const durationMs = SPEED_MS[this.speed];

    if (durationMs === 0) {
      // Instant: skip animation
      this.cube.applyMove(token);
      this.emitFrame(this.currentParsed, 1);
      this.callbacks.onMoveComplete?.(token, this.queue.length);
      this.currentParsed = null;
      // Continue draining synchronously
      this.drainNext();
      return;
    }

    this.animStart = performance.now();
    this.pauseElapsed = 0;
    this.paused = false;
    this.tick();
  }

  private tick = (): void => {
    if (this.paused || !this.currentParsed) return;

    const elapsed = performance.now() - this.animStart;
    const duration = SPEED_MS[this.speed];
    const rawProgress = Math.min(elapsed / duration, 1);
    const progress = easeOutCubic(rawProgress);

    this.emitFrame(this.currentParsed, progress);

    if (rawProgress < 1) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      // Animation complete — now update logical state
      const token = this.currentParsed.face + this.suffixFromAngle(this.currentParsed.angle);
      this.cube.applyMove(token);
      this.currentParsed = null;
      this.rafId = null;

      this.callbacks.onMoveComplete?.(token, this.queue.length);

      // Drain next
      this.drainNext();
    }
  };

  private emitFrame(parsed: { face: FaceName; angle: number }, progress: number): void {
    const { axis, layerValue, sign } = faceToAxis(parsed.face);
    const targetAngle = sign * parsed.angle;
    const currentAngle = targetAngle * progress;

    this.callbacks.onFrame?.({
      face: parsed.face,
      axis,
      layerValue,
      targetAngle,
      currentAngle,
      progress,
    });
  }

  private suffixFromAngle(angle: number): string {
    if (Math.abs(angle) === Math.PI) return '2';
    if (angle < 0) return "'";
    return '';
  }
}
