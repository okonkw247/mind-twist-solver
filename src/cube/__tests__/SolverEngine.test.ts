/**
 * Unit tests for SolverEngine
 */

import { describe, it, expect, beforeAll } from 'vitest';
import Cube from 'cubejs';
import {
  initSolver,
  validateFacelets,
  solveFacelets,
  colorArraysToFacelets,
  solveFromColorArrays,
  type SolveResult,
  type SolveError,
} from '../SolverEngine';

const SOLVED = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

// Solver init is heavy (~4s) — do it once
beforeAll(async () => {
  await initSolver();
}, 30_000);

// Helper: scramble a solved cube and return its facelet string
function scrambledFacelets(alg: string): string {
  const cube = Cube.fromString(SOLVED);
  cube.move(alg);
  return cube.asString();
}

// ─── Validation ──────────────────────────────────────────────────────────────

describe('validateFacelets', () => {
  it('accepts a valid solved cube', () => {
    expect(validateFacelets(SOLVED)).toEqual({ valid: true, errors: [] });
  });

  it('rejects wrong length', () => {
    const result = validateFacelets('UUU');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('54');
  });

  it('rejects invalid characters', () => {
    const bad = 'X' + SOLVED.slice(1);
    const result = validateFacelets(bad);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid character');
  });

  it('rejects wrong color counts', () => {
    // 10 U's and 8 R's
    const bad = 'UUUUUUUUUURRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
    const result = validateFacelets(bad);
    expect(result.valid).toBe(false);
  });

  it('rejects wrong center facelets', () => {
    // Swap center of U (pos 4) with R center (pos 13) — counts stay at 9 each
    const chars = SOLVED.split('');
    [chars[4], chars[13]] = [chars[13], chars[4]];
    const result = validateFacelets(chars.join(''));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Center');
  });
});

// ─── Color array conversion ─────────────────────────────────────────────────

describe('colorArraysToFacelets', () => {
  it('converts a solved state correctly', () => {
    const state = {
      up:    Array(9).fill('white'),
      right: Array(9).fill('red'),
      front: Array(9).fill('green'),
      down:  Array(9).fill('yellow'),
      left:  Array(9).fill('orange'),
      back:  Array(9).fill('blue'),
    };
    expect(colorArraysToFacelets(state)).toBe(SOLVED);
  });

  it('throws on unknown color', () => {
    const state = {
      up:    Array(9).fill('purple'),
      right: Array(9).fill('red'),
      front: Array(9).fill('green'),
      down:  Array(9).fill('yellow'),
      left:  Array(9).fill('orange'),
      back:  Array(9).fill('blue'),
    };
    expect(() => colorArraysToFacelets(state)).toThrow('Unknown color');
  });
});

// ─── Solving ─────────────────────────────────────────────────────────────────

describe('solveFacelets', () => {
  it('solves a solved cube (may return identity or short solution)', () => {
    const result = solveFacelets(SOLVED);
    expect(result.success).toBe(true);
    // cubejs may return a non-empty "solution" for identity state
    // (it returns upright moves). Just verify it succeeds.
  });

  it('solves a scrambled cube and solution is correct', () => {
    const scramble = "R U R' U' F2 D L2 B'";
    const facelets = scrambledFacelets(scramble);

    const result = solveFacelets(facelets);
    expect(result.success).toBe(true);

    const sr = result as SolveResult;
    expect(sr.moveCount).toBeGreaterThan(0);
    expect(sr.moves.length).toBe(sr.moveCount);

    // Verify: apply solution to scrambled cube → must be solved
    const verify = Cube.fromString(facelets);
    verify.move(sr.algorithm);
    expect(verify.isSolved()).toBe(true);
  });

  it('solves a heavily scrambled cube in ≤22 moves', () => {
    const cube = Cube.random();
    const facelets = cube.asString();

    const result = solveFacelets(facelets);
    expect(result.success).toBe(true);

    const sr = result as SolveResult;
    expect(sr.moveCount).toBeLessThanOrEqual(22);

    // Verify
    const verify = Cube.fromString(facelets);
    verify.move(sr.algorithm);
    expect(verify.isSolved()).toBe(true);
  });

  it('returns error for invalid facelets', () => {
    const result = solveFacelets('INVALID');
    expect(result.success).toBe(false);
    expect((result as SolveError).error).toBeDefined();
  });
});

describe('solveFromColorArrays', () => {
  it('solves a scrambled color-array state', () => {
    const scramble = "F R U' B2 D L";
    const str = scrambledFacelets(scramble);

    // Convert facelet string back to color arrays
    const FACE_TO_COLOR: Record<string, string> = {
      U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue',
    };
    const faceNames = ['up', 'right', 'front', 'down', 'left', 'back'];
    const state: Record<string, string[]> = {};
    for (let i = 0; i < 6; i++) {
      state[faceNames[i]] = [];
      for (let j = 0; j < 9; j++) {
        state[faceNames[i]].push(FACE_TO_COLOR[str[i * 9 + j]]);
      }
    }

    const result = solveFromColorArrays(state);
    expect(result.success).toBe(true);
    expect((result as SolveResult).moveCount).toBeGreaterThan(0);
  });
});
