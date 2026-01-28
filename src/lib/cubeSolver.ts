// Cube Solver Service - Legacy exports for backward compatibility
// Main implementation is now in kociembaSolver.ts

// Re-export from new implementation
export { 
  cubeStateToKociembaString,
  parseSolution,
  generateScramble,
  invertSolution,
  type CubeMove,
} from './kociembaSolver';

export { solveCubeKociemba as solveCube } from './kociembaSolver';
export { validateCubeSolvability, quickValidate } from './cubeValidator';

// Color mapping for cube notation (kept for backward compatibility)
export const colorToFace: Record<string, string> = {
  white: 'U',
  yellow: 'D', 
  green: 'F',
  blue: 'B',
  red: 'R',
  orange: 'L',
  empty: 'X',
};

// Face order for the solver: U R F D L B
export const faceOrder = ['up', 'right', 'front', 'down', 'left', 'back'];

// Move descriptions (kept for backward compatibility)
export const moveDescriptions: Record<string, string> = {
  'R': 'Rotate right face clockwise',
  "R'": 'Rotate right face counter-clockwise',
  'R2': 'Rotate right face 180°',
  'L': 'Rotate left face clockwise',
  "L'": 'Rotate left face counter-clockwise',
  'L2': 'Rotate left face 180°',
  'U': 'Rotate upper face clockwise',
  "U'": 'Rotate upper face counter-clockwise',
  'U2': 'Rotate upper face 180°',
  'D': 'Rotate down face clockwise',
  "D'": 'Rotate down face counter-clockwise',
  'D2': 'Rotate down face 180°',
  'F': 'Rotate front face clockwise',
  "F'": 'Rotate front face counter-clockwise',
  'F2': 'Rotate front face 180°',
  'B': 'Rotate back face clockwise',
  "B'": 'Rotate back face counter-clockwise',
  'B2': 'Rotate back face 180°',
};

// Validate cube state (legacy wrapper)
export function validateCubeState(cubeState: Record<string, string[]>): { valid: boolean; error?: string } {
  const colorCounts: Record<string, number> = {};
  
  for (const face of Object.values(cubeState)) {
    for (const color of face) {
      if (color === 'empty') {
        return { valid: false, error: 'All stickers must be colored' };
      }
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  }
  
  // Each color should appear exactly 9 times
  for (const [color, count] of Object.entries(colorCounts)) {
    if (count !== 9) {
      return { valid: false, error: `${color} appears ${count} times, should be 9` };
    }
  }
  
  return { valid: true };
}
