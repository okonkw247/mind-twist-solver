import { validateCubeSolvability, ValidationResult } from './cubeValidator';
import { ensureSolverWorkerReady, solveInWorker } from './solverWorkerClient';

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
  angle: number;
  layer: number;
}

const moveDescriptions: Record<string, string> = {
  'R': 'Rotate right face clockwise', "R'": 'Rotate right face counter-clockwise', 'R2': 'Rotate right face 180°',
  'L': 'Rotate left face clockwise', "L'": 'Rotate left face counter-clockwise', 'L2': 'Rotate left face 180°',
  'U': 'Rotate upper face clockwise', "U'": 'Rotate upper face counter-clockwise', 'U2': 'Rotate upper face 180°',
  'D': 'Rotate down face clockwise', "D'": 'Rotate down face counter-clockwise', 'D2': 'Rotate down face 180°',
  'F': 'Rotate front face clockwise', "F'": 'Rotate front face counter-clockwise', 'F2': 'Rotate front face 180°',
  'B': 'Rotate back face clockwise', "B'": 'Rotate back face counter-clockwise', 'B2': 'Rotate back face 180°',
};

const faceToAxis: Record<string, 'x' | 'y' | 'z'> = { 'R': 'x', 'L': 'x', 'U': 'y', 'D': 'y', 'F': 'z', 'B': 'z' };
const faceToDirection: Record<string, number> = { 'R': -1, 'L': 1, 'U': -1, 'D': 1, 'F': -1, 'B': 1 };
const colorToFace: Record<string, string> = { white: 'U', yellow: 'D', green: 'F', blue: 'B', red: 'R', orange: 'L' };

export function cubeStateToKociembaString(cubeState: Record<string, string[]>): string {
  const faceOrder = ['up', 'right', 'front', 'down', 'left', 'back'];
  let result = '';
  for (const face of faceOrder) {
    const colors = cubeState[face] || Array(9).fill('empty');
    for (const color of colors) result += colorToFace[color] || 'X';
  }
  return result;
}

export function parseSolution(solutionString: string): CubeMove[] {
  if (!solutionString || solutionString.trim() === '') return [];
  const moves = solutionString.trim().split(/\s+/).filter(m => m.length > 0);
  return moves.map(notation => {
    const face = notation[0];
    let direction: 'clockwise' | 'counter-clockwise' | 'double' = 'clockwise';
    let angle = 90 * faceToDirection[face];
    if (notation.includes("'")) { direction = 'counter-clockwise'; angle = -angle; }
    else if (notation.includes('2')) { direction = 'double'; angle = 180; }
    return {
      notation, face, direction,
      description: moveDescriptions[notation] || `Move ${notation}`,
      axis: faceToAxis[face] || 'y', angle, layer: 0,
    };
  });
}

export async function solveCubeKociemba(cubeState: Record<string, string[]>): Promise<SolveResult> {
  const validationResult = validateCubeSolvability(cubeState);
  if (!validationResult.valid) {
    return { success: false, error: validationResult.errors.map(e => e.message).join('; '), validationResult };
  }

  try {
    await ensureSolverWorkerReady();
    const stateString = cubeStateToKociembaString(cubeState);
    const solution = await solveInWorker(stateString);

    if (!solution || solution === '') {
      return { success: false, error: 'No solution found - cube may be in an impossible state', validationResult };
    }

    const moves = parseSolution(solution);
    return { success: true, solution: moves.map(m => m.notation), moveCount: moves.length, validationResult };
  } catch (error) {
    console.error('Solver error:', error);
    return { success: false, error: 'Failed to solve cube - please verify your input', validationResult };
  }
}

export async function getSolutionMoves(cubeState: Record<string, string[]>): Promise<{
  success: boolean; moves?: CubeMove[]; error?: string;
}> {
  const result = await solveCubeKociemba(cubeState);
  if (!result.success || !result.solution) return { success: false, error: result.error };
  return { success: true, moves: parseSolution(result.solution.join(' ')) };
}

export function generateScramble(length: number = 20): string {
  const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
  const modifiers = ['', "'", '2'];
  const moves: string[] = [];
  let lastFace = ''; let secondLastFace = '';
  for (let i = 0; i < length; i++) {
    let face: string;
    do { face = faces[Math.floor(Math.random() * faces.length)]; }
    while (face === lastFace || (face === secondLastFace && isOppositeFace(face, lastFace)));
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    moves.push(face + modifier);
    secondLastFace = lastFace; lastFace = face;
  }
  return moves.join(' ');
}

function isOppositeFace(a: string, b: string): boolean {
  const opposites: Record<string, string> = { 'R': 'L', 'L': 'R', 'U': 'D', 'D': 'U', 'F': 'B', 'B': 'F' };
  return opposites[a] === b;
}

export function invertSolution(moves: CubeMove[]): CubeMove[] {
  return [...moves].reverse().map(move => {
    let newNotation = move.notation, newDirection = move.direction, newAngle = move.angle;
    if (move.direction === 'clockwise') { newNotation = move.face + "'"; newDirection = 'counter-clockwise'; newAngle = -move.angle; }
    else if (move.direction === 'counter-clockwise') { newNotation = move.face; newDirection = 'clockwise'; newAngle = -move.angle; }
    return { ...move, notation: newNotation, direction: newDirection, angle: newAngle, description: moveDescriptions[newNotation] || `Move ${newNotation}` };
  });
}
