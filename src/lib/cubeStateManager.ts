// Unified Cube State Manager
// Single source of truth for cube state across all modes: scramble, solve, play, input, undo, redo

export type FaceName = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type ColorName = 'white' | 'yellow' | 'red' | 'orange' | 'blue' | 'green' | 'empty';

export interface CubieState {
  id: string;
  position: [number, number, number];
  colors: Partial<Record<FaceName, ColorName>>;
}

// Solved state colors per face
export const SOLVED_FACE_COLORS: Record<FaceName, ColorName> = {
  U: 'white',
  D: 'yellow',
  L: 'orange',
  R: 'red',
  F: 'green',
  B: 'blue',
};

// Face to state key mapping (for UI state)
export const FACE_TO_KEY: Record<FaceName, string> = {
  U: 'up',
  D: 'down',
  L: 'left',
  R: 'right',
  F: 'front',
  B: 'back',
};

export const KEY_TO_FACE: Record<string, FaceName> = {
  up: 'U',
  down: 'D',
  left: 'L',
  right: 'R',
  front: 'F',
  back: 'B',
};

// Generate initial solved cubie state
export function generateSolvedCubies(): CubieState[] {
  const cubies: CubieState[] = [];
  const positions = [-1, 0, 1];
  
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        if (x === 1 && y === 1 && z === 1) continue; // Skip center
        
        const pos: [number, number, number] = [positions[x], positions[y], positions[z]];
        const colors: Partial<Record<FaceName, ColorName>> = {};
        
        if (z === 2) colors.F = SOLVED_FACE_COLORS.F;
        if (z === 0) colors.B = SOLVED_FACE_COLORS.B;
        if (y === 2) colors.U = SOLVED_FACE_COLORS.U;
        if (y === 0) colors.D = SOLVED_FACE_COLORS.D;
        if (x === 0) colors.L = SOLVED_FACE_COLORS.L;
        if (x === 2) colors.R = SOLVED_FACE_COLORS.R;
        
        cubies.push({ id: `${x}-${y}-${z}`, position: pos, colors });
      }
    }
  }
  
  return cubies;
}

// Convert flat face arrays to cubie state
export function facesToCubies(faceState: Record<string, string[]>): CubieState[] {
  const cubies: CubieState[] = [];
  const positions = [-1, 0, 1];
  
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        if (x === 1 && y === 1 && z === 1) continue;
        
        const pos: [number, number, number] = [positions[x], positions[y], positions[z]];
        const colors: Partial<Record<FaceName, ColorName>> = {};
        
        // Map position to face indices
        if (z === 2) { // Front
          const idx = (2 - y) * 3 + x;
          colors.F = (faceState.front?.[idx] || 'empty') as ColorName;
        }
        if (z === 0) { // Back
          const idx = (2 - y) * 3 + (2 - x);
          colors.B = (faceState.back?.[idx] || 'empty') as ColorName;
        }
        if (y === 2) { // Up
          const idx = z * 3 + x;
          colors.U = (faceState.up?.[idx] || 'empty') as ColorName;
        }
        if (y === 0) { // Down
          const idx = (2 - z) * 3 + x;
          colors.D = (faceState.down?.[idx] || 'empty') as ColorName;
        }
        if (x === 0) { // Left
          const idx = (2 - y) * 3 + (2 - z);
          colors.L = (faceState.left?.[idx] || 'empty') as ColorName;
        }
        if (x === 2) { // Right
          const idx = (2 - y) * 3 + z;
          colors.R = (faceState.right?.[idx] || 'empty') as ColorName;
        }
        
        cubies.push({ id: `${x}-${y}-${z}`, position: pos, colors });
      }
    }
  }
  
  return cubies;
}

// Convert cubie state back to flat face arrays
export function cubiesToFaces(cubies: CubieState[]): Record<string, string[]> {
  const faces: Record<string, string[]> = {
    front: Array(9).fill('empty'),
    back: Array(9).fill('empty'),
    up: Array(9).fill('empty'),
    down: Array(9).fill('empty'),
    left: Array(9).fill('empty'),
    right: Array(9).fill('empty'),
  };
  
  for (const cubie of cubies) {
    const [x, y, z] = cubie.position;
    const xIdx = x + 1;
    const yIdx = y + 1;
    const zIdx = z + 1;
    
    if (cubie.colors.F && z === 1) {
      const idx = (2 - yIdx) * 3 + xIdx;
      faces.front[idx] = cubie.colors.F;
    }
    if (cubie.colors.B && z === -1) {
      const idx = (2 - yIdx) * 3 + (2 - xIdx);
      faces.back[idx] = cubie.colors.B;
    }
    if (cubie.colors.U && y === 1) {
      const idx = zIdx * 3 + xIdx;
      faces.up[idx] = cubie.colors.U;
    }
    if (cubie.colors.D && y === -1) {
      const idx = (2 - zIdx) * 3 + xIdx;
      faces.down[idx] = cubie.colors.D;
    }
    if (cubie.colors.L && x === -1) {
      const idx = (2 - yIdx) * 3 + (2 - zIdx);
      faces.left[idx] = cubie.colors.L;
    }
    if (cubie.colors.R && x === 1) {
      const idx = (2 - yIdx) * 3 + zIdx;
      faces.right[idx] = cubie.colors.R;
    }
  }
  
  return faces;
}

// Move info for animation
export interface MoveInfo {
  axis: 'x' | 'y' | 'z';
  layerValue: number;
  angle: number;
}

// Get axis and layer for a move notation
export function getMoveInfo(notation: string): MoveInfo {
  const face = notation[0] as FaceName;
  let axis: 'x' | 'y' | 'z' = 'y';
  let layerValue = 1;
  let angle = Math.PI / 2;
  
  switch (face) {
    case 'R': axis = 'x'; layerValue = 1; break;
    case 'L': axis = 'x'; layerValue = -1; break;
    case 'U': axis = 'y'; layerValue = 1; break;
    case 'D': axis = 'y'; layerValue = -1; break;
    case 'F': axis = 'z'; layerValue = 1; break;
    case 'B': axis = 'z'; layerValue = -1; break;
  }
  
  const baseDirection = (face === 'R' || face === 'U' || face === 'F') ? -1 : 1;
  
  if (notation.includes("'")) {
    angle = -baseDirection * Math.PI / 2;
  } else if (notation.includes('2')) {
    angle = Math.PI;
  } else {
    angle = baseDirection * Math.PI / 2;
  }
  
  return { axis, layerValue, angle };
}

// Check if cubie is in a layer
export function isInLayer(position: [number, number, number], axis: 'x' | 'y' | 'z', layerValue: number): boolean {
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  return Math.round(position[axisIndex]) === layerValue;
}

// Rotate position around axis
export function rotatePosition(
  position: [number, number, number],
  axis: 'x' | 'y' | 'z',
  angle: number
): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [x, y, z] = position;
  
  switch (axis) {
    case 'x':
      return [x, Math.round(y * cos - z * sin), Math.round(y * sin + z * cos)];
    case 'y':
      return [Math.round(x * cos + z * sin), y, Math.round(-x * sin + z * cos)];
    case 'z':
      return [Math.round(x * cos - y * sin), Math.round(x * sin + y * cos), z];
  }
}

// Rotate cubie colors after move
export function rotateColors(
  colors: Partial<Record<FaceName, ColorName>>,
  axis: 'x' | 'y' | 'z',
  angle: number
): Partial<Record<FaceName, ColorName>> {
  const steps = Math.round(angle / (Math.PI / 2));
  const absSteps = Math.abs(steps) % 4;
  const direction = steps > 0 ? 1 : -1;
  
  let result = { ...colors };
  
  for (let i = 0; i < absSteps; i++) {
    const prev = { ...result };
    
    if (axis === 'x') {
      if (direction > 0) {
        result = { ...prev, U: prev.F, B: prev.U, D: prev.B, F: prev.D };
      } else {
        result = { ...prev, U: prev.B, F: prev.U, D: prev.F, B: prev.D };
      }
    } else if (axis === 'y') {
      if (direction > 0) {
        result = { ...prev, F: prev.R, L: prev.F, B: prev.L, R: prev.B };
      } else {
        result = { ...prev, F: prev.L, R: prev.F, B: prev.R, L: prev.B };
      }
    } else {
      if (direction > 0) {
        result = { ...prev, U: prev.L, R: prev.U, D: prev.R, L: prev.D };
      } else {
        result = { ...prev, U: prev.R, L: prev.U, D: prev.L, R: prev.D };
      }
    }
  }
  
  return result;
}

// Apply a move to cubies (instant, no animation)
export function applyMove(cubies: CubieState[], notation: string): CubieState[] {
  const { axis, layerValue, angle } = getMoveInfo(notation);
  
  return cubies.map(cubie => {
    if (!isInLayer(cubie.position, axis, layerValue)) {
      return cubie;
    }
    
    return {
      ...cubie,
      position: rotatePosition(cubie.position, axis, angle),
      colors: rotateColors(cubie.colors, axis, angle),
    };
  });
}

// Apply multiple moves
export function applyMoves(cubies: CubieState[], moves: string[]): CubieState[] {
  let result = cubies;
  for (const move of moves) {
    result = applyMove(result, move);
  }
  return result;
}

// Get inverse of a move notation
export function getInverseNotation(notation: string): string {
  const face = notation[0];
  if (notation.includes("'")) {
    return face;
  } else if (notation.includes('2')) {
    return notation;
  } else {
    return face + "'";
  }
}
