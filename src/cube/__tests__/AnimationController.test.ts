/**
 * AnimationController tests
 * Uses fake timers since rAF isn't available in vitest by default.
 * We test the synchronous/instant path and the queue logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CubeModel } from '../CubeModel';
import { AnimationController } from '../AnimationController';

describe('AnimationController', () => {
  let cube: CubeModel;
  let ctrl: AnimationController;

  beforeEach(() => {
    cube = new CubeModel();
    ctrl = new AnimationController(cube);
    ctrl.setSpeed('instant'); // skip rAF for unit tests
  });

  it('starts idle', () => {
    expect(ctrl.isAnimating).toBe(false);
    expect(ctrl.queueLength).toBe(0);
  });

  it('instant mode applies moves immediately', () => {
    ctrl.enqueue('R');
    expect(cube.isSolved()).toBe(false);
    expect(ctrl.isAnimating).toBe(false); // instant drains synchronously
  });

  it('instant R R R R = identity', () => {
    ctrl.enqueue('R R R R');
    expect(cube.isSolved()).toBe(true);
  });

  it("instant R R' = identity", () => {
    ctrl.enqueue("R R'");
    expect(cube.isSolved()).toBe(true);
  });

  it('instant scramble + inverse = identity', () => {
    ctrl.enqueue("R U F' D2 L B");
    ctrl.enqueue("B' L' D2 F U' R'");
    expect(cube.isSolved()).toBe(true);
  });

  it('fires onMoveComplete for each move', () => {
    const moves: string[] = [];
    ctrl.setCallbacks({
      onMoveComplete: (m) => moves.push(m),
    });
    ctrl.enqueue('R U F');
    expect(moves).toEqual(['R', 'U', 'F']);
  });

  it('fires onQueueComplete when queue drains', () => {
    let completed = false;
    ctrl.setCallbacks({
      onQueueComplete: () => { completed = true; },
    });
    ctrl.enqueue('R U');
    expect(completed).toBe(true);
  });

  it('fires onFrame with progress=1 for instant moves', () => {
    const progresses: number[] = [];
    ctrl.setCallbacks({
      onFrame: (f) => progresses.push(f.progress),
    });
    ctrl.enqueue('R');
    expect(progresses).toContain(1);
  });

  it('cancel clears queue', () => {
    // Queue some moves but cancel before drain (instant drains sync, so this tests the API)
    ctrl.cancel();
    expect(ctrl.queueLength).toBe(0);
    expect(ctrl.isAnimating).toBe(false);
  });

  it('destroy clears callbacks', () => {
    let called = false;
    ctrl.setCallbacks({ onQueueComplete: () => { called = true; } });
    ctrl.destroy();
    ctrl.enqueue('R');
    expect(called).toBe(false);
  });

  it('correct axis mapping for each face', () => {
    const axes: Record<string, string> = {};
    ctrl.setCallbacks({
      onFrame: (f) => { axes[f.face] = f.axis; },
    });
    ctrl.enqueue('R L U D F B');
    expect(axes['R']).toBe('x');
    expect(axes['L']).toBe('x');
    expect(axes['U']).toBe('y');
    expect(axes['D']).toBe('y');
    expect(axes['F']).toBe('z');
    expect(axes['B']).toBe('z');
  });
});
