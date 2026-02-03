/**
 * Rigid-Body Rubik's Cube Engine
 * 
 * This is a mathematically correct implementation where:
 * - Each cubie has a position vector (x, y, z) ∈ {-1, 0, 1}³
 * - Each cubie has an orientation quaternion
 * - Colors are PERMANENTLY attached to the cubie's LOCAL faces
 * - Moves apply rotation matrices (SO(3)) to both position and orientation
 * - Colors NEVER move independently - they rotate WITH the cubie
 */

import * as THREE from 'three';

export type FaceName = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type ColorName = 'white' | 'yellow' | 'red' | 'orange' | 'blue' | 'green';
export type MoveNotation = 'R' | "R'" | 'R2' | 'L' | "L'" | 'L2' | 'U' | "U'" | 'U2' | 'D' | "D'" | 'D2' | 'F' | "F'" | 'F2' | 'B' | "B'" | 'B2';

// Solved state: which color is on which face
export const SOLVED_COLORS: Record<FaceName, ColorName> = {
  U: 'white',
  D: 'yellow',
  F: 'green',
  B: 'blue',
  R: 'red',
  L: 'orange',
};

// World-space normals for each face
export const FACE_NORMALS: Record<FaceName, THREE.Vector3> = {
  U: new THREE.Vector3(0, 1, 0),
  D: new THREE.Vector3(0, -1, 0),
  R: new THREE.Vector3(1, 0, 0),
  L: new THREE.Vector3(-1, 0, 0),
  F: new THREE.Vector3(0, 0, 1),
  B: new THREE.Vector3(0, 0, -1),
};

/**
 * Rigid Cubie - represents one of the 26 external pieces
 * 
 * Colors are stored in LOCAL SPACE - they are defined once at creation
 * and NEVER modified. The orientation quaternion tracks how the cubie
 * has rotated from its initial solved state.
 */
export interface RigidCubie {
  // Unique ID based on solved position
  id: string;
  
  // Current world-space position (always integer values after move completes)
  position: THREE.Vector3;
  
  // Current orientation as quaternion - tracks cumulative rotation
  orientation: THREE.Quaternion;
  
  // LOCAL face colors - these NEVER change, set once at creation
  // Maps local face direction to color
  localColors: Map<string, ColorName>;
}

/**
 * Get the rotation axis for a face move
 */
export function getMoveAxis(face: FaceName): THREE.Vector3 {
  switch (face) {
    case 'R': return new THREE.Vector3(1, 0, 0);
    case 'L': return new THREE.Vector3(-1, 0, 0);
    case 'U': return new THREE.Vector3(0, 1, 0);
    case 'D': return new THREE.Vector3(0, -1, 0);
    case 'F': return new THREE.Vector3(0, 0, 1);
    case 'B': return new THREE.Vector3(0, 0, -1);
  }
}

/**
 * Get layer value for a face move
 */
export function getLayerValue(face: FaceName): number {
  switch (face) {
    case 'R': return 1;
    case 'L': return -1;
    case 'U': return 1;
    case 'D': return -1;
    case 'F': return 1;
    case 'B': return -1;
  }
}

/**
 * Get the axis component index
 */
export function getAxisIndex(face: FaceName): 0 | 1 | 2 {
  switch (face) {
    case 'R':
    case 'L':
      return 0; // x
    case 'U':
    case 'D':
      return 1; // y
    case 'F':
    case 'B':
      return 2; // z
  }
}

/**
 * Parse move notation to get face, angle, and direction
 */
export function parseMove(notation: string): { face: FaceName; angle: number } {
  const face = notation[0] as FaceName;
  let angle = Math.PI / 2; // 90 degrees
  
  // Standard Rubik's Cube convention:
  // Clockwise when looking at the face = positive rotation around outward normal
  // For R, U, F: positive axis = clockwise
  // For L, D, B: negative axis, so we invert
  
  const isPositiveAxis = face === 'R' || face === 'U' || face === 'F';
  
  if (notation.includes("'")) {
    // Counter-clockwise
    angle = isPositiveAxis ? Math.PI / 2 : -Math.PI / 2;
  } else if (notation.includes('2')) {
    // 180 degrees
    angle = Math.PI;
  } else {
    // Clockwise
    angle = isPositiveAxis ? -Math.PI / 2 : Math.PI / 2;
  }
  
  return { face, angle };
}

/**
 * Create a rotation quaternion for a move
 */
export function createMoveQuaternion(face: FaceName, angle: number): THREE.Quaternion {
  const axis = getMoveAxis(face).normalize();
  return new THREE.Quaternion().setFromAxisAngle(axis, angle);
}

/**
 * Check if a cubie is in the rotating layer
 */
export function isInLayer(position: THREE.Vector3, face: FaceName): boolean {
  const axisIndex = getAxisIndex(face);
  const layerValue = getLayerValue(face);
  const coord = axisIndex === 0 ? position.x : axisIndex === 1 ? position.y : position.z;
  return Math.round(coord) === layerValue;
}

/**
 * Create the 26 cubies in solved state
 * 
 * Each cubie has colors assigned to its LOCAL faces based on its
 * initial position. These colors are PERMANENT.
 */
export function createSolvedCubies(): RigidCubie[] {
  const cubies: RigidCubie[] = [];
  
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        // Skip the invisible center cubie
        if (x === 0 && y === 0 && z === 0) continue;
        
        const id = `${x},${y},${z}`;
        const position = new THREE.Vector3(x, y, z);
        const orientation = new THREE.Quaternion(); // Identity = solved orientation
        const localColors = new Map<string, ColorName>();
        
        // Assign colors based on which external faces this cubie has
        // Colors are stored by their LOCAL direction (which equals world direction when solved)
        if (x === 1) localColors.set('1,0,0', SOLVED_COLORS.R);
        if (x === -1) localColors.set('-1,0,0', SOLVED_COLORS.L);
        if (y === 1) localColors.set('0,1,0', SOLVED_COLORS.U);
        if (y === -1) localColors.set('0,-1,0', SOLVED_COLORS.D);
        if (z === 1) localColors.set('0,0,1', SOLVED_COLORS.F);
        if (z === -1) localColors.set('0,0,-1', SOLVED_COLORS.B);
        
        cubies.push({ id, position, orientation, localColors });
      }
    }
  }
  
  return cubies;
}

/**
 * Apply a move to the cube state
 * 
 * This performs a RIGID BODY rotation:
 * 1. Select cubies in the rotating layer
 * 2. Rotate their POSITIONS around the axis
 * 3. Update their ORIENTATIONS by composing with the rotation quaternion
 * 4. Snap positions to integers
 * 
 * Colors are NOT touched - they move because the cubie moves
 */
export function applyMoveToCubies(cubies: RigidCubie[], notation: string): RigidCubie[] {
  const { face, angle } = parseMove(notation);
  const rotationQuat = createMoveQuaternion(face, angle);
  const axis = getMoveAxis(face);
  
  return cubies.map(cubie => {
    if (!isInLayer(cubie.position, face)) {
      return cubie;
    }
    
    // Create new position by rotating around axis
    const newPosition = cubie.position.clone();
    newPosition.applyQuaternion(rotationQuat);
    
    // Snap to integer values to prevent floating-point drift
    newPosition.x = Math.round(newPosition.x);
    newPosition.y = Math.round(newPosition.y);
    newPosition.z = Math.round(newPosition.z);
    
    // Compose new orientation: newOrientation = rotationQuat * currentOrientation
    const newOrientation = rotationQuat.clone().multiply(cubie.orientation);
    newOrientation.normalize(); // Prevent quaternion drift
    
    return {
      ...cubie,
      position: newPosition,
      orientation: newOrientation,
    };
  });
}

/**
 * Get the world-space color visible on a face of a cubie
 * 
 * This transforms the local face normal by the cubie's orientation
 * to find which local color is now facing in that world direction.
 */
export function getVisibleColor(
  cubie: RigidCubie,
  worldFace: FaceName
): ColorName | null {
  const worldNormal = FACE_NORMALS[worldFace];
  
  // Transform world normal to local space by applying inverse orientation
  const inverseOrientation = cubie.orientation.clone().invert();
  const localNormal = worldNormal.clone().applyQuaternion(inverseOrientation);
  
  // Round to get the local face direction
  const localKey = `${Math.round(localNormal.x)},${Math.round(localNormal.y)},${Math.round(localNormal.z)}`;
  
  return cubie.localColors.get(localKey) || null;
}

/**
 * Convert rigid cubies to face color arrays (for solver compatibility)
 */
export function cubiesToFaceArrays(cubies: RigidCubie[]): Record<string, string[]> {
  const faces: Record<string, string[]> = {
    front: Array(9).fill('empty'),
    back: Array(9).fill('empty'),
    up: Array(9).fill('empty'),
    down: Array(9).fill('empty'),
    left: Array(9).fill('empty'),
    right: Array(9).fill('empty'),
  };
  
  for (const cubie of cubies) {
    const x = Math.round(cubie.position.x);
    const y = Math.round(cubie.position.y);
    const z = Math.round(cubie.position.z);
    
    // Front face (z = 1)
    if (z === 1) {
      const color = getVisibleColor(cubie, 'F');
      if (color) {
        const idx = (1 - y) * 3 + (x + 1);
        faces.front[idx] = color;
      }
    }
    
    // Back face (z = -1)
    if (z === -1) {
      const color = getVisibleColor(cubie, 'B');
      if (color) {
        const idx = (1 - y) * 3 + (1 - x);
        faces.back[idx] = color;
      }
    }
    
    // Up face (y = 1)
    if (y === 1) {
      const color = getVisibleColor(cubie, 'U');
      if (color) {
        const idx = (z + 1) * 3 + (x + 1);
        faces.up[idx] = color;
      }
    }
    
    // Down face (y = -1)
    if (y === -1) {
      const color = getVisibleColor(cubie, 'D');
      if (color) {
        const idx = (1 - z) * 3 + (x + 1);
        faces.down[idx] = color;
      }
    }
    
    // Left face (x = -1)
    if (x === -1) {
      const color = getVisibleColor(cubie, 'L');
      if (color) {
        const idx = (1 - y) * 3 + (1 - z);
        faces.left[idx] = color;
      }
    }
    
    // Right face (x = 1)
    if (x === 1) {
      const color = getVisibleColor(cubie, 'R');
      if (color) {
        const idx = (1 - y) * 3 + (z + 1);
        faces.right[idx] = color;
      }
    }
  }
  
  return faces;
}

/**
 * Get inverse notation for undo
 */
export function getInverseMove(notation: string): string {
  const face = notation[0];
  if (notation.includes("'")) {
    return face;
  } else if (notation.includes('2')) {
    return notation;
  } else {
    return face + "'";
  }
}

/**
 * Apply multiple moves sequentially
 */
export function applyMoves(cubies: RigidCubie[], moves: string[]): RigidCubie[] {
  let result = cubies;
  for (const move of moves) {
    result = applyMoveToCubies(result, move);
  }
  return result;
}

/**
 * Clone cubies array (deep clone)
 */
export function cloneCubies(cubies: RigidCubie[]): RigidCubie[] {
  return cubies.map(cubie => ({
    id: cubie.id,
    position: cubie.position.clone(),
    orientation: cubie.orientation.clone(),
    localColors: new Map(cubie.localColors),
  }));
}

/**
 * Check if cube is in solved state
 */
export function isSolved(cubies: RigidCubie[]): boolean {
  for (const cubie of cubies) {
    // Check if position matches original
    const [ox, oy, oz] = cubie.id.split(',').map(Number);
    const x = Math.round(cubie.position.x);
    const y = Math.round(cubie.position.y);
    const z = Math.round(cubie.position.z);
    
    if (x !== ox || y !== oy || z !== oz) return false;
    
    // Check if orientation is identity (or very close to it)
    const identity = new THREE.Quaternion();
    const dot = Math.abs(cubie.orientation.dot(identity));
    if (dot < 0.999) return false;
  }
  
  return true;
}
