/**
 * Unit tests for CubeModel — pure logic tests (no solver dependency)
 */

import { describe, it, expect } from 'vitest';
import { CubeModel, type FaceName, type ColorName } from '../CubeModel';

// ─── Solved state ────────────────────────────────────────────────────────────

describe('Solved state', () => {
  it('has 26 cubies', () => {
    const model = new CubeModel();
    expect(model.cubies.length).toBe(26);
  });

  it('isSolved() returns true for new cube', () => {
    const model = new CubeModel();
    expect(model.isSolved()).toBe(true);
  });

  it('face arrays show correct solved colors', () => {
    const model = new CubeModel();
    const faces = model.toFaceArrays();
    expect(faces.up.every(c => c === 'white')).toBe(true);
    expect(faces.down.every(c => c === 'yellow')).toBe(true);
    expect(faces.front.every(c => c === 'green')).toBe(true);
    expect(faces.back.every(c => c === 'blue')).toBe(true);
    expect(faces.right.every(c => c === 'red')).toBe(true);
    expect(faces.left.every(c => c === 'orange')).toBe(true);
  });

  it('facelet string matches solved cubejs string', () => {
    const model = new CubeModel();
    expect(model.toFaceletString()).toBe(
      'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
    );
  });
});

// ─── Single moves ────────────────────────────────────────────────────────────

describe('Single moves', () => {
  it('R move makes cube unsolved', () => {
    const model = new CubeModel();
    model.applyMove('R');
    expect(model.isSolved()).toBe(false);
  });

  it('R R R R = identity', () => {
    const model = new CubeModel();
    model.applyMoves('R R R R');
    expect(model.isSolved()).toBe(true);
  });

  it("R R' = identity", () => {
    const model = new CubeModel();
    model.applyMoves("R R'");
    expect(model.isSolved()).toBe(true);
  });

  it('R2 R2 = identity', () => {
    const model = new CubeModel();
    model.applyMoves('R2 R2');
    expect(model.isSolved()).toBe(true);
  });

  it('each face: X X X X = identity', () => {
    const faces: FaceName[] = ['R', 'L', 'U', 'D', 'F', 'B'];
    for (const face of faces) {
      const model = new CubeModel();
      model.applyMoves(`${face} ${face} ${face} ${face}`);
      expect(model.isSolved()).toBe(true);
    }
  });

  it("sexy move ×6 = identity (R U R' U')×6", () => {
    const model = new CubeModel();
    for (let i = 0; i < 6; i++) {
      model.applyMoves("R U R' U'");
    }
    expect(model.isSolved()).toBe(true);
  });
});

// ─── Colors are rigid ────────────────────────────────────────────────────────

describe('Color rigidity', () => {
  it('localColors never change after moves', () => {
    const model = new CubeModel();
    const before = new Map<string, Map<string, ColorName>>();
    for (const c of model.cubies) {
      before.set(c.id, new Map(c.localColors));
    }
    model.applyMoves("R U F' D2 L B R' U2 F D' L2 B'");
    for (const c of model.cubies) {
      const originalColors = before.get(c.id)!;
      expect(c.localColors).toEqual(originalColors);
    }
  });
});

// ─── Undo ────────────────────────────────────────────────────────────────────

describe('Undo', () => {
  it('undo single move restores solved state', () => {
    const model = new CubeModel();
    model.applyMove('R');
    model.undoMove();
    expect(model.isSolved()).toBe(true);
  });

  it('undo all moves restores solved state', () => {
    const model = new CubeModel();
    model.applyMoves("R U F' D2 L B");
    while (model.moveHistory.length > 0) {
      model.undoMove();
    }
    expect(model.isSolved()).toBe(true);
  });

  it('undo on empty history returns null', () => {
    const model = new CubeModel();
    expect(model.undoMove()).toBeNull();
  });
});

// ─── Reset & clone ───────────────────────────────────────────────────────────

describe('Reset & clone', () => {
  it('reset restores solved state and clears history', () => {
    const model = new CubeModel();
    model.applyMoves("R U F'");
    model.reset();
    expect(model.isSolved()).toBe(true);
    expect(model.moveHistory.length).toBe(0);
  });

  it('clone is independent', () => {
    const model = new CubeModel();
    model.applyMove('R');
    const copy = model.clone();
    model.applyMove('U');
    expect(copy.moveHistory.length).toBe(1);
    expect(model.moveHistory.length).toBe(2);
  });
});

// ─── getCubiesInLayer ────────────────────────────────────────────────────────

describe('getCubiesInLayer', () => {
  it('each face layer has 9 cubies', () => {
    const model = new CubeModel();
    const faces: FaceName[] = ['R', 'L', 'U', 'D', 'F', 'B'];
    for (const face of faces) {
      expect(model.getCubiesInLayer(face).length).toBe(9);
    }
  });
});
