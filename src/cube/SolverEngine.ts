/**
 * SolverEngine — Clean wrapper around cubejs (Kociemba two-phase algorithm)
 *
 * This module is PURE LOGIC. No React, no Three.js, no UI.
 * It validates facelet strings and solves them.
 *
 * Facelet string format (54 chars, 9 per face, order: U R F D L B):
 *   U = white, R = red, F = green, D = yellow, L = orange, B = blue
 *
 * Facelet layout per the cubejs convention:
 *              +------------+
 *              | U1  U2  U3 |
 *              | U4  U5  U6 |
 *              | U7  U8  U9 |
 * +------------+------------+------------+------------+
 * | L1  L2  L3 | F1  F2  F3 | R1  R2  R3 | B1  B2  B3 |
 * | L4  L5  L6 | F4  F5  F6 | R4  R5  R6 | B4  B5  B6 |
 * | L7  L8  L9 | F7  F8  F9 | R7  R8  R9 | B7  B8  B9 |
 * +------------+------------+------------+------------+
 *              | D1  D2  D3 |
 *              | D4  D5  D6 |
 *              | D7  D8  D9 |
 *              +------------+
 */

import Cube from 'cubejs';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SolveResult {
  success: boolean;
  algorithm: string;   // e.g. "R U R' U'"
  moves: string[];     // e.g. ["R", "U", "R'", "U'"]
  moveCount: number;
  timeMs: number;
}

export interface SolveError {
  success: false;
  error: string;
}

// ─── Color mapping ───────────────────────────────────────────────────────────

/** Map our app's color names → cubejs face letters */
export const COLOR_TO_FACE: Record<string, string> = {
  white:  'U',
  red:    'R',
  green:  'F',
  yellow: 'D',
  orange: 'L',
  blue:   'B',
};

/** Reverse: cubejs face letter → color name */
export const FACE_TO_COLOR: Record<string, string> = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
};

// ─── Solver initialisation ───────────────────────────────────────────────────

let _initialised = false;
let _initialising: Promise<void> | null = null;

/**
 * Initialise the Kociemba lookup tables (runs once, ~4-5 s).
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initSolver(): Promise<void> {
  if (_initialised) return;
  if (_initialising) return _initialising;

  _initialising = new Promise<void>((resolve) => {
    // cubejs.initSolver() is synchronous but heavy — wrap in setTimeout
    // so the UI thread gets a chance to render a loading indicator first.
    setTimeout(() => {
      Cube.initSolver();
      _initialised = true;
      _initialising = null;
      resolve();
    }, 0);
  });

  return _initialising;
}

export function isSolverReady(): boolean {
  return _initialised;
}

// ─── Validation ──────────────────────────────────────────────────────────────

const VALID_FACES = new Set(['U', 'R', 'F', 'D', 'L', 'B']);

/**
 * Validate a 54-character facelet string.
 *
 * Checks performed:
 *  1. Length === 54
 *  2. Only valid face characters (U R F D L B)
 *  3. Exactly 9 of each face character
 *  4. Center facelets match their face (positions 4,13,22,31,40,49)
 */
export function validateFacelets(facelets: string): ValidationResult {
  const errors: string[] = [];

  // 1. Length
  if (facelets.length !== 54) {
    errors.push(`Expected 54 facelets, got ${facelets.length}`);
    return { valid: false, errors };
  }

  // 2. Valid characters
  for (let i = 0; i < 54; i++) {
    if (!VALID_FACES.has(facelets[i])) {
      errors.push(`Invalid character '${facelets[i]}' at position ${i}`);
    }
  }
  if (errors.length > 0) return { valid: false, errors };

  // 3. Count per face
  const counts: Record<string, number> = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
  for (const ch of facelets) counts[ch]++;
  for (const [face, count] of Object.entries(counts)) {
    if (count !== 9) {
      errors.push(`Face ${face} appears ${count} times (need exactly 9)`);
    }
  }
  if (errors.length > 0) return { valid: false, errors };

  // 4. Centers must match their face
  const centerPositions = [4, 13, 22, 31, 40, 49];
  const expectedCenters = ['U', 'R', 'F', 'D', 'L', 'B'];
  for (let i = 0; i < 6; i++) {
    if (facelets[centerPositions[i]] !== expectedCenters[i]) {
      errors.push(
        `Center of face ${expectedCenters[i]} is '${facelets[centerPositions[i]]}' — must be '${expectedCenters[i]}'`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Convert our app's face-color-array state to a cubejs facelet string.
 *
 * Input format: { up: string[9], right: string[9], front: string[9],
 *                 down: string[9], left: string[9], back: string[9] }
 * Each string[] contains color names like "white", "red", etc.
 */
export function colorArraysToFacelets(state: Record<string, string[]>): string {
  const order = ['up', 'right', 'front', 'down', 'left', 'back'];
  let result = '';
  for (const face of order) {
    const colors = state[face];
    if (!colors || colors.length !== 9) {
      throw new Error(`Face '${face}' is missing or has ${colors?.length} stickers`);
    }
    for (const color of colors) {
      const ch = COLOR_TO_FACE[color];
      if (!ch) throw new Error(`Unknown color '${color}' on face '${face}'`);
      result += ch;
    }
  }
  return result;
}

// ─── Solving ─────────────────────────────────────────────────────────────────

/**
 * Solve a cube from a 54-character facelet string.
 *
 * Returns a SolveResult on success, or a SolveError on failure.
 * The solver MUST be initialised first via `initSolver()`.
 */
export function solveFacelets(facelets: string): SolveResult | SolveError {
  // Validate first
  const validation = validateFacelets(facelets);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('; ') };
  }

  if (!_initialised) {
    return { success: false, error: 'Solver not initialised — call initSolver() first' };
  }

  try {
    const t0 = performance.now();
    const cube = Cube.fromString(facelets);
    const algorithm = cube.solve();
    const t1 = performance.now();

    if (algorithm == null || algorithm === '') {
      // Solved cube returns empty string
      return {
        success: true,
        algorithm: '',
        moves: [],
        moveCount: 0,
        timeMs: t1 - t0,
      };
    }

    const moves = algorithm.trim().split(/\s+/);

    return {
      success: true,
      algorithm: algorithm.trim(),
      moves,
      moveCount: moves.length,
      timeMs: t1 - t0,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'cubejs solver threw an error',
    };
  }
}

/**
 * High-level solve: takes our app's color-array state, returns solution.
 */
export function solveFromColorArrays(
  state: Record<string, string[]>
): SolveResult | SolveError {
  try {
    const facelets = colorArraysToFacelets(state);
    return solveFacelets(facelets);
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to convert state' };
  }
}

// ─── Console verification ────────────────────────────────────────────────────

/**
 * Run a self-test that scrambles a solved cube and verifies the solver
 * finds a correct solution. Logs results to console.
 *
 * Call from browser console: `window.__testSolver()`
 */
export async function selfTest(): Promise<void> {
  console.group('🧊 SolverEngine self-test');

  // 1. Init
  console.time('initSolver');
  await initSolver();
  console.timeEnd('initSolver');

  // 2. Solved cube should return empty solution
  const solvedStr = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
  const solvedResult = solveFacelets(solvedStr);
  console.log('Solved cube test:', solvedResult);
  if (!solvedResult.success) {
    console.error('❌ FAIL: Solved cube returned error');
    console.groupEnd();
    return;
  }
  console.log('✅ Solved cube: moveCount =', (solvedResult as SolveResult).moveCount);

  // 3. Scramble and solve
  const scramble = "R U R' U' F' D2 L B' R2 U F2 D2 R2 B2 L2 F' U2 B L2";
  const scrambledCube = Cube.fromString(solvedStr);
  scrambledCube.move(scramble);
  const scrambledStr = scrambledCube.asString();
  console.log('Scrambled state:', scrambledStr);

  const result = solveFacelets(scrambledStr);
  console.log('Solve result:', result);

  if (!result.success) {
    console.error('❌ FAIL:', (result as SolveError).error);
    console.groupEnd();
    return;
  }

  const sr = result as SolveResult;
  console.log(`✅ Solution found: ${sr.moveCount} moves in ${sr.timeMs.toFixed(1)}ms`);
  console.log('   Algorithm:', sr.algorithm);

  // 4. Verify by applying solution to scrambled cube
  const verifyCube = Cube.fromString(solvedStr);
  verifyCube.move(scramble);
  verifyCube.move(sr.algorithm);
  const isSolved = verifyCube.isSolved();
  console.log(`✅ Verification: cube.isSolved() = ${isSolved}`);
  if (!isSolved) {
    console.error('❌ FAIL: Solution did not solve the cube!');
  }

  console.groupEnd();
}

// Expose to browser console for manual testing
if (typeof window !== 'undefined') {
  (window as any).__testSolver = selfTest;
}
