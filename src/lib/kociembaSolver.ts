// Kociemba Two-Phase Algorithm Implementation
// This wraps the cubejs library with proper validation

import Cube from 'cubejs';
import { validateCubeSolvability, ValidationResult } from './cubeValidator';

export interface SolveResult {
  success: boolean;
  solution?: string[];
  moveCount?: number;
  error?: string;
  validationResult?: ValidationResult;
}

export interface CubeMove {
  notation: string;
  face: string;
  direction: 'clockwise' | 'counter-clockwise' | 'double';
  description: string;
  axis: 'x' | 'y' | 'z';
  angle: number; // degrees: 90, -90, or 180
  layer: number; // 0 = outer layer
}

// Move descriptions
const moveDescriptions: Record<string, string> = {
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

// Map face to rotation axis
const faceToAxis: Record<string, 'x' | 'y' | 'z'> = {
  'R': 'x',
  'L': 'x',
  'U': 'y',
  'D': 'y',
  'F': 'z',
  'B': 'z',
};

// Map face to rotation direction (for clockwise rotation)
const faceToDirection: Record<string, number> = {
  'R': -1,
  'L': 1,
  'U': -1,
  'D': 1,
  'F': -1,
  'B': 1,
};

// Color to Kociemba face notation
const colorToFace: Record<string, string> = {
  white: 'U',
  yellow: 'D',
  green: 'F',
  blue: 'B',
  red: 'R',
  orange: 'L',
};

// Initialize cubejs solver tables
let solverInitialized = false;

async function initSolver(): Promise<void> {
  if (solverInitialized) return;
  
  return new Promise((resolve) => {
    // Initialize the solver (generates lookup tables)
    Cube.initSolver();
    solverInitialized = true;
    resolve();
  });
}

// Convert our cube state to Kociemba notation string
export function cubeStateToKociembaString(cubeState: Record<string, string[]>): string {
  // Kociemba order: U R F D L B (9 stickers each = 54 total)
  const faceOrder = ['up', 'right', 'front', 'down', 'left', 'back'];
  let result = '';
  
  for (const face of faceOrder) {
    const colors = cubeState[face] || Array(9).fill('empty');
    for (const color of colors) {
      result += colorToFace[color] || 'X';
    }
  }
  
  return result;
}

// Parse solution string into move objects
export function parseSolution(solutionString: string): CubeMove[] {
  if (!solutionString || solutionString.trim() === '') {
    return [];
  }
  
  const moves = solutionString.trim().split(/\s+/).filter(m => m.length > 0);
  
  return moves.map(notation => {
    const face = notation[0];
    let direction: 'clockwise' | 'counter-clockwise' | 'double' = 'clockwise';
    let angle = 90 * faceToDirection[face];
    
    if (notation.includes("'")) {
      direction = 'counter-clockwise';
      angle = -angle;
    } else if (notation.includes('2')) {
      direction = 'double';
      angle = 180;
    }
    
    return {
      notation,
      face,
      direction,
      description: moveDescriptions[notation] || `Move ${notation}`,
      axis: faceToAxis[face] || 'y',
      angle,
      layer: 0,
    };
  });
}

// Main solve function with validation
export async function solveCubeKociemba(cubeState: Record<string, string[]>): Promise<SolveResult> {
  // Step 1: Validate cube state
  const validationResult = validateCubeSolvability(cubeState);
  
  if (!validationResult.valid) {
    const errorMessages = validationResult.errors.map(e => e.message).join('; ');
    return {
      success: false,
      error: errorMessages,
      validationResult,
    };
  }
  
  try {
    // Step 2: Initialize solver
    await initSolver();
    
    // Step 3: Convert state to Kociemba string
    const stateString = cubeStateToKociembaString(cubeState);
    
    // Step 4: Create cube and solve
    const cube = Cube.fromString(stateString);
    const solution = cube.solve();
    
    if (!solution || solution === '') {
      return {
        success: false,
        error: 'No solution found - cube may be in an impossible state',
        validationResult,
      };
    }
    
    // Step 5: Parse solution
    const moves = parseSolution(solution);
    
    return {
      success: true,
      solution: moves.map(m => m.notation),
      moveCount: moves.length,
      validationResult,
    };
    
  } catch (error) {
    console.error('Solver error:', error);
    return {
      success: false,
      error: 'Failed to solve cube - please verify your input',
      validationResult,
    };
  }
}

// Get parsed moves for animation
export async function getSolutionMoves(cubeState: Record<string, string[]>): Promise<{
  success: boolean;
  moves?: CubeMove[];
  error?: string;
}> {
  const result = await solveCubeKociemba(cubeState);
  
  if (!result.success || !result.solution) {
    return {
      success: false,
      error: result.error,
    };
  }
  
  return {
    success: true,
    moves: parseSolution(result.solution.join(' ')),
  };
}

// Generate a random scramble
export function generateScramble(length: number = 20): string {
  const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
  const modifiers = ['', "'", '2'];
  const moves: string[] = [];
  let lastFace = '';
  let secondLastFace = '';
  
  for (let i = 0; i < length; i++) {
    let face: string;
    do {
      face = faces[Math.floor(Math.random() * faces.length)];
      // Avoid same face twice, and avoid opposite faces in sequence (like R L R)
    } while (face === lastFace || (face === secondLastFace && isOppositeFace(face, lastFace)));
    
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    moves.push(face + modifier);
    
    secondLastFace = lastFace;
    lastFace = face;
  }
  
  return moves.join(' ');
}

function isOppositeFace(a: string, b: string): boolean {
  const opposites: Record<string, string> = {
    'R': 'L', 'L': 'R',
    'U': 'D', 'D': 'U',
    'F': 'B', 'B': 'F',
  };
  return opposites[a] === b;
}

// Invert a solution (for scrambling from solved state)
export function invertSolution(moves: CubeMove[]): CubeMove[] {
  return [...moves].reverse().map(move => {
    let newNotation = move.notation;
    let newDirection = move.direction;
    let newAngle = move.angle;
    
    if (move.direction === 'clockwise') {
      newNotation = move.face + "'";
      newDirection = 'counter-clockwise';
      newAngle = -move.angle;
    } else if (move.direction === 'counter-clockwise') {
      newNotation = move.face;
      newDirection = 'clockwise';
      newAngle = -move.angle;
    }
    // Double moves stay the same
    
    return {
      ...move,
      notation: newNotation,
      direction: newDirection,
      angle: newAngle,
      description: moveDescriptions[newNotation] || `Move ${newNotation}`,
    };
  });
}
