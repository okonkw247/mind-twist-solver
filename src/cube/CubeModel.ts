/**
 * CubeModel — Pure-logic cubie-based Rubik's Cube
 *
 * ZERO rendering dependencies. No Three.js. No React.
 *
 * The cube consists of 26 cubies (excluding the invisible center).
 * Each cubie has:
 *   - position: [x, y, z] where x, y, z ∈ {-1, 0, 1}
 *   - orientation: 3×3 rotation matrix (SO(3), stored as flat 9-element array)
 *   - localColors: colors permanently attached to local face normals
 *
 * Moves are 90° rigid rotations about a principal axis.
 * Colors NEVER move independently — they rotate WITH the cubie.
 *
 * State truth lives here. Rendering reads from this model.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type FaceName = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type ColorName = 'white' | 'yellow' | 'red' | 'orange' | 'blue' | 'green';
export type Vec3 = [number, number, number];

/**
 * 3×3 rotation matrix stored as row-major flat array [m00,m01,m02, m10,m11,m12, m20,m21,m22]
 */
export type Mat3 = [
  number, number, number,
  number, number, number,
  number, number, number,
];

/** Direction key for local face normals, e.g. "1,0,0" */
export type DirKey = string;

export interface Cubie {
  /** Unique ID = solved position string, e.g. "1,-1,0" */
  readonly id: string;
  /** Current world-space position — always integers after a move completes */
  position: Vec3;
  /** Cumulative orientation as rotation matrix (identity when solved) */
  orientation: Mat3;
  /** LOCAL face colors — set once at creation, NEVER mutated */
  readonly localColors: ReadonlyMap<DirKey, ColorName>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const IDENTITY_MAT3: Mat3 = [1,0,0, 0,1,0, 0,0,1];

export const SOLVED_FACE_COLORS: Record<FaceName, ColorName> = {
  U: 'white',
  D: 'yellow',
  R: 'red',
  L: 'orange',
  F: 'green',
  B: 'blue',
};

const FACE_NORMALS: Record<FaceName, Vec3> = {
  U: [0, 1, 0],
  D: [0,-1, 0],
  R: [1, 0, 0],
  L: [-1,0, 0],
  F: [0, 0, 1],
  B: [0, 0,-1],
};

/** Which axis index each face rotates around */
const FACE_AXIS: Record<FaceName, 0 | 1 | 2> = {
  R: 0, L: 0,
  U: 1, D: 1,
  F: 2, B: 2,
};

/** Layer coordinate value for each face */
const FACE_LAYER: Record<FaceName, number> = {
  R: 1, L: -1,
  U: 1, D: -1,
  F: 1, B: -1,
};

// ─── Matrix math ─────────────────────────────────────────────────────────────

function mat3Multiply(a: Mat3, b: Mat3): Mat3 {
  return [
    a[0]*b[0] + a[1]*b[3] + a[2]*b[6],
    a[0]*b[1] + a[1]*b[4] + a[2]*b[7],
    a[0]*b[2] + a[1]*b[5] + a[2]*b[8],

    a[3]*b[0] + a[4]*b[3] + a[5]*b[6],
    a[3]*b[1] + a[4]*b[4] + a[5]*b[7],
    a[3]*b[2] + a[4]*b[5] + a[5]*b[8],

    a[6]*b[0] + a[7]*b[3] + a[8]*b[6],
    a[6]*b[1] + a[7]*b[4] + a[8]*b[7],
    a[6]*b[2] + a[7]*b[5] + a[8]*b[8],
  ];
}

function mat3TransformVec3(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0]*v[0] + m[1]*v[1] + m[2]*v[2],
    m[3]*v[0] + m[4]*v[1] + m[5]*v[2],
    m[6]*v[0] + m[7]*v[1] + m[8]*v[2],
  ];
}

function mat3Transpose(m: Mat3): Mat3 {
  return [
    m[0], m[3], m[6],
    m[1], m[4], m[7],
    m[2], m[5], m[8],
  ];
}

function snapVec3(v: Vec3): Vec3 {
  return [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])];
}

/**
 * Build a 90° rotation matrix about a principal axis.
 *
 * Rotation matrices for θ = ±π/2:
 *
 *  X-axis: [1  0     0   ]    Y-axis: [ cosθ 0 sinθ]    Z-axis: [cosθ -sinθ 0]
 *          [0  cosθ -sinθ]            [ 0    1 0   ]            [sinθ  cosθ 0]
 *          [0  sinθ  cosθ]            [-sinθ 0 cosθ]            [0     0    1]
 *
 * cos(π/2) = 0, sin(π/2) = 1 — ensures cos²θ + sin²θ = 1 (exact).
 */
export function buildRotationMatrix(axis: 0 | 1 | 2, quarterTurns: number): Mat3 {
  // quarterTurns: 1 = 90° CW, -1 = 90° CCW, 2 = 180°
  const turns = ((quarterTurns % 4) + 4) % 4; // normalize to 0..3

  if (turns === 0) return [...IDENTITY_MAT3] as Mat3;

  // Pre-computed exact values (no floating-point trig)
  const cosVal = [1, 0, -1, 0][turns]; // cos(0), cos(90), cos(180), cos(270)
  const sinVal = [0, 1, 0, -1][turns]; // sin(0), sin(90), sin(180), sin(270)

  const c = cosVal;
  const s = sinVal;

  switch (axis) {
    case 0: // X-axis
      return [1,0,0, 0,c,-s, 0,s,c];
    case 1: // Y-axis
      return [c,0,s, 0,1,0, -s,0,c];
    case 2: // Z-axis
      return [c,-s,0, s,c,0, 0,0,1];
  }
}

// ─── Move parsing ────────────────────────────────────────────────────────────

interface ParsedMove {
  face: FaceName;
  axis: 0 | 1 | 2;
  layerValue: number;
  /** Quarter turns: 1 = CW, -1 = CCW, 2 = half turn */
  quarterTurns: number;
  rotationMatrix: Mat3;
}

/**
 * Parse Singmaster notation to a structured move.
 *
 * Convention: "CW" means clockwise when looking at the face from outside.
 *  - R: CW when looking at +X face → rotation is -90° around X
 *  - L: CW when looking at -X face → rotation is +90° around X
 *  - U: CW when looking at +Y face → rotation is -90° around Y
 *  - D: CW when looking at -Y face → rotation is +90° around Y
 *  - F: CW when looking at +Z face → rotation is -90° around Z
 *  - B: CW when looking at -Z face → rotation is +90° around Z
 */
export function parseMove(notation: string): ParsedMove {
  const face = notation[0] as FaceName;
  const axis = FACE_AXIS[face];
  const layerValue = FACE_LAYER[face];

  // Determine direction sign
  const isPositiveLayer = layerValue > 0;
  // CW when looking at positive face = -1 quarterTurn in math convention
  const cwSign = isPositiveLayer ? -1 : 1;

  let quarterTurns: number;
  if (notation.includes("'")) {
    quarterTurns = -cwSign; // CCW = opposite of CW
  } else if (notation.includes('2')) {
    quarterTurns = 2;
  } else {
    quarterTurns = cwSign;
  }

  const rotationMatrix = buildRotationMatrix(axis, quarterTurns);

  return { face, axis, layerValue, quarterTurns, rotationMatrix };
}

/**
 * Get the inverse notation for a move.
 */
export function getInverseNotation(notation: string): string {
  const face = notation[0];
  if (notation.includes("'")) return face;
  if (notation.includes('2')) return notation;
  return face + "'";
}

// ─── CubeModel class ────────────────────────────────────────────────────────

export class CubeModel {
  private _cubies: Cubie[];
  private _moveHistory: string[] = [];

  constructor() {
    this._cubies = CubeModel._createSolvedCubies();
  }

  // ── Factory ──────────────────────────────────────────────────────────────

  private static _createSolvedCubies(): Cubie[] {
    const cubies: Cubie[] = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue; // skip center

          const id = `${x},${y},${z}`;
          const position: Vec3 = [x, y, z];
          const orientation: Mat3 = [...IDENTITY_MAT3] as Mat3;
          const localColors = new Map<DirKey, ColorName>();

          // Assign colors based on external faces
          if (x ===  1) localColors.set('1,0,0',  SOLVED_FACE_COLORS.R);
          if (x === -1) localColors.set('-1,0,0', SOLVED_FACE_COLORS.L);
          if (y ===  1) localColors.set('0,1,0',  SOLVED_FACE_COLORS.U);
          if (y === -1) localColors.set('0,-1,0', SOLVED_FACE_COLORS.D);
          if (z ===  1) localColors.set('0,0,1',  SOLVED_FACE_COLORS.F);
          if (z === -1) localColors.set('0,0,-1', SOLVED_FACE_COLORS.B);

          cubies.push({ id, position, orientation, localColors });
        }
      }
    }

    return cubies;
  }

  // ── Read-only access ─────────────────────────────────────────────────────

  /** Get a snapshot of all cubies (shallow — positions/orientations are arrays, safe to read) */
  get cubies(): readonly Cubie[] {
    return this._cubies;
  }

  get moveHistory(): readonly string[] {
    return this._moveHistory;
  }

  // ── Move execution ───────────────────────────────────────────────────────

  /**
   * Apply a single move. This updates cubie positions and orientations.
   *
   * STEP BY STEP (e.g. R move):
   *  1. Select cubies where position[axisIndex] === layerValue  (x === 1)
   *  2. For each selected cubie:
   *     a. Rotate position: newPos = rotMatrix × position
   *     b. Snap position to integers
   *     c. Compose orientation: newOrientation = rotMatrix × orientation
   *  3. Colors are NOT touched — they move because the cubie moves
   */
  applyMove(notation: string): void {
    const { axis, layerValue, rotationMatrix } = parseMove(notation);

    for (let i = 0; i < this._cubies.length; i++) {
      const cubie = this._cubies[i];

      // Step 1: check if cubie is in the rotating layer
      if (Math.round(cubie.position[axis]) !== layerValue) continue;

      // Step 2a: rotate position
      const newPos = mat3TransformVec3(rotationMatrix, cubie.position);

      // Step 2b: snap to integers (REQUIRED to prevent floating-point drift)
      cubie.position = snapVec3(newPos);

      // Step 2c: compose orientation
      cubie.orientation = mat3Multiply(rotationMatrix, cubie.orientation);
    }

    this._moveHistory.push(notation);
  }

  /**
   * Apply a sequence of moves (space-separated string or array).
   */
  applyMoves(movesOrString: string | string[]): void {
    const moves = typeof movesOrString === 'string'
      ? movesOrString.trim().split(/\s+/).filter(Boolean)
      : movesOrString;

    for (const move of moves) {
      this.applyMove(move);
    }
  }

  /**
   * Undo the last move.
   */
  undoMove(): string | null {
    const last = this._moveHistory.pop();
    if (!last) return null;

    const inverse = getInverseNotation(last);
    // Apply inverse WITHOUT recording in history
    const { axis, layerValue, rotationMatrix } = parseMove(inverse);
    for (const cubie of this._cubies) {
      if (Math.round(cubie.position[axis]) !== layerValue) continue;
      cubie.position = snapVec3(mat3TransformVec3(rotationMatrix, cubie.position));
      cubie.orientation = mat3Multiply(rotationMatrix, cubie.orientation);
    }

    return last;
  }

  /**
   * Reset to solved state.
   */
  reset(): void {
    this._cubies = CubeModel._createSolvedCubies();
    this._moveHistory = [];
  }

  // ── State queries ────────────────────────────────────────────────────────

  /**
   * Get the color visible on a cubie's world-facing side.
   *
   * We transform the world-normal into local space using the cubie's
   * INVERSE orientation (transpose, since it's orthogonal), then look
   * up which local color is stored at that direction.
   */
  getVisibleColor(cubie: Cubie, worldFace: FaceName): ColorName | null {
    const worldNormal = FACE_NORMALS[worldFace];
    // inverse of orthogonal matrix = transpose
    const invOrientation = mat3Transpose(cubie.orientation);
    const localNormal = snapVec3(mat3TransformVec3(invOrientation, worldNormal));
    const key: DirKey = `${localNormal[0]},${localNormal[1]},${localNormal[2]}`;
    return cubie.localColors.get(key) ?? null;
  }

  /**
   * Check if the cube is solved.
   * A cubie is solved if its position matches its ID and orientation is identity.
   */
  isSolved(): boolean {
    for (const cubie of this._cubies) {
      const [ox, oy, oz] = cubie.id.split(',').map(Number);
      const [x, y, z] = cubie.position;

      if (x !== ox || y !== oy || z !== oz) return false;

      // Check orientation ≈ identity
      const o = cubie.orientation;
      if (
        o[0] !== 1 || o[1] !== 0 || o[2] !== 0 ||
        o[3] !== 0 || o[4] !== 1 || o[5] !== 0 ||
        o[6] !== 0 || o[7] !== 0 || o[8] !== 1
      ) return false;
    }
    return true;
  }

  /**
   * Convert cubie state → face color arrays for solver compatibility.
   *
   * Returns: { up: string[9], right: string[9], front: string[9],
   *            down: string[9], left: string[9], back: string[9] }
   */
  toFaceArrays(): Record<string, string[]> {
    const faces: Record<string, string[]> = {
      up:    Array(9).fill('empty'),
      right: Array(9).fill('empty'),
      front: Array(9).fill('empty'),
      down:  Array(9).fill('empty'),
      left:  Array(9).fill('empty'),
      back:  Array(9).fill('empty'),
    };

    for (const cubie of this._cubies) {
      const [x, y, z] = cubie.position;

      if (y === 1) {
        const color = this.getVisibleColor(cubie, 'U');
        if (color) faces.up[(z + 1) * 3 + (x + 1)] = color;
      }
      if (y === -1) {
        const color = this.getVisibleColor(cubie, 'D');
        if (color) faces.down[(1 - z) * 3 + (x + 1)] = color;
      }
      if (x === 1) {
        const color = this.getVisibleColor(cubie, 'R');
        if (color) faces.right[(1 - y) * 3 + (z + 1)] = color;
      }
      if (x === -1) {
        const color = this.getVisibleColor(cubie, 'L');
        if (color) faces.left[(1 - y) * 3 + (1 - z)] = color;
      }
      if (z === 1) {
        const color = this.getVisibleColor(cubie, 'F');
        if (color) faces.front[(1 - y) * 3 + (x + 1)] = color;
      }
      if (z === -1) {
        const color = this.getVisibleColor(cubie, 'B');
        if (color) faces.back[(1 - y) * 3 + (1 - x)] = color;
      }
    }

    return faces;
  }

  /**
   * Convert cubie state → 54-char facelet string (URFDLB order) for cubejs.
   */
  toFaceletString(): string {
    const arrays = this.toFaceArrays();
    const COLOR_TO_FACE: Record<string, string> = {
      white: 'U', red: 'R', green: 'F', yellow: 'D', orange: 'L', blue: 'B',
    };
    const order = ['up', 'right', 'front', 'down', 'left', 'back'];
    let result = '';
    for (const face of order) {
      for (const color of arrays[face]) {
        result += COLOR_TO_FACE[color] ?? 'X';
      }
    }
    return result;
  }

  /**
   * Get cubies in a specific layer (for animation controller).
   */
  getCubiesInLayer(face: FaceName): Cubie[] {
    const axis = FACE_AXIS[face];
    const layerValue = FACE_LAYER[face];
    return this._cubies.filter(c => Math.round(c.position[axis]) === layerValue);
  }

  /**
   * Deep clone this model.
   */
  clone(): CubeModel {
    const copy = new CubeModel();
    copy._cubies = this._cubies.map(c => ({
      id: c.id,
      position: [...c.position] as Vec3,
      orientation: [...c.orientation] as Mat3,
      localColors: c.localColors, // readonly, safe to share
    }));
    copy._moveHistory = [...this._moveHistory];
    return copy;
  }
}
