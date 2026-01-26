// Type definitions for cubejs
declare module 'cubejs' {
  export interface Cube {
    asString(): string;
    move(moves: string): Cube;
    isSolved(): boolean;
    solve(): string;
    randomize(): Cube;
    toJSON(): object;
  }

  export function initSolver(): void;
  export function fromString(state: string): Cube;
  export function random(): Cube;
  export function scramble(): string;
  export function solve(cube: Cube | string): string;
}
