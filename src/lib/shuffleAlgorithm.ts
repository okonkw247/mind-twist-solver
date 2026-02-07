/**
 * Proper Rubik's Cube Shuffle Algorithm
 * 
 * IMPORTANT: This generates LEGAL moves only, ensuring the cube
 * is always in a solvable state. Never randomize colors directly!
 */

export type MoveFace = 'R' | 'L' | 'U' | 'D' | 'F' | 'B';
export type MoveModifier = '' | "'" | '2';
export type Move = `${MoveFace}${MoveModifier}`;

const FACES: MoveFace[] = ['R', 'L', 'U', 'D', 'F', 'B'];
const MODIFIERS: MoveModifier[] = ['', "'", '2'];

// Opposite faces - we avoid R followed by L followed by R patterns
const OPPOSITE_FACES: Record<MoveFace, MoveFace> = {
  R: 'L', L: 'R',
  U: 'D', D: 'U',
  F: 'B', B: 'F',
};

/**
 * Generate a proper random scramble using legal moves only
 * 
 * This follows WCA (World Cube Association) scramble rules:
 * 1. No consecutive moves on the same face
 * 2. No sequences like R L R (same face, opposite, same face)
 * 3. Random distribution of all move types
 */
export function generateProperScramble(length: number = 20): Move[] {
  const moves: Move[] = [];
  let lastFace: MoveFace | null = null;
  let secondLastFace: MoveFace | null = null;
  
  for (let i = 0; i < length; i++) {
    let face: MoveFace;
    let attempts = 0;
    
    do {
      face = FACES[Math.floor(Math.random() * FACES.length)];
      attempts++;
      
      // Safety check to prevent infinite loops
      if (attempts > 100) {
        face = FACES.find(f => f !== lastFace) || FACES[0];
        break;
      }
      
    } while (
      // Rule 1: No same face twice in a row
      face === lastFace ||
      // Rule 2: Avoid patterns like R L R (redundant moves)
      (face === secondLastFace && lastFace === OPPOSITE_FACES[face])
    );
    
    const modifier = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    moves.push(`${face}${modifier}` as Move);
    
    secondLastFace = lastFace;
    lastFace = face;
  }
  
  return moves;
}

/**
 * Generate scramble as a string (space-separated)
 */
export function generateScrambleString(length: number = 20): string {
  return generateProperScramble(length).join(' ');
}

/**
 * Validate a scramble is using only legal moves
 */
export function isValidScramble(moves: string[]): boolean {
  const validMovePattern = /^[RLUDFB]['2]?$/;
  
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    
    // Check move format
    if (!validMovePattern.test(move)) {
      return false;
    }
    
    // Check no consecutive same face
    if (i > 0) {
      const prevFace = moves[i - 1][0];
      const currFace = move[0];
      if (prevFace === currFace) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Get the inverse of a move (for undo operations)
 */
export function getInverseMove(move: string): string {
  const face = move[0];
  
  if (move.includes("'")) {
    return face; // R' -> R
  } else if (move.includes('2')) {
    return move; // R2 -> R2
  } else {
    return face + "'"; // R -> R'
  }
}

/**
 * Simplify a move sequence by removing redundant moves
 * e.g., R R -> R2, R R' -> (nothing), R R R -> R'
 */
export function simplifyMoves(moves: string[]): string[] {
  const simplified: string[] = [];
  
  for (const move of moves) {
    if (simplified.length === 0) {
      simplified.push(move);
      continue;
    }
    
    const lastMove = simplified[simplified.length - 1];
    const lastFace = lastMove[0];
    const currFace = move[0];
    
    // If same face, combine them
    if (lastFace === currFace) {
      const lastQuarters = getQuarterTurns(lastMove);
      const currQuarters = getQuarterTurns(move);
      const totalQuarters = (lastQuarters + currQuarters) % 4;
      
      simplified.pop();
      
      if (totalQuarters === 0) {
        // Moves cancel out, don't add anything
      } else if (totalQuarters === 1) {
        simplified.push(currFace);
      } else if (totalQuarters === 2) {
        simplified.push(currFace + '2');
      } else { // totalQuarters === 3
        simplified.push(currFace + "'");
      }
    } else {
      simplified.push(move);
    }
  }
  
  return simplified;
}

/**
 * Convert a move to number of quarter turns
 */
function getQuarterTurns(move: string): number {
  if (move.includes('2')) return 2;
  if (move.includes("'")) return 3; // Counter-clockwise = 3 quarter turns CW
  return 1;
}

/**
 * Generate scramble with move descriptions for display
 */
export function generateScrambleWithDescriptions(length: number = 20): Array<{
  notation: string;
  description: string;
}> {
  const moves = generateProperScramble(length);
  
  const descriptions: Record<string, string> = {
    'R': 'Right clockwise',
    "R'": 'Right counter-clockwise',
    'R2': 'Right 180°',
    'L': 'Left clockwise',
    "L'": 'Left counter-clockwise',
    'L2': 'Left 180°',
    'U': 'Up clockwise',
    "U'": 'Up counter-clockwise',
    'U2': 'Up 180°',
    'D': 'Down clockwise',
    "D'": 'Down counter-clockwise',
    'D2': 'Down 180°',
    'F': 'Front clockwise',
    "F'": 'Front counter-clockwise',
    'F2': 'Front 180°',
    'B': 'Back clockwise',
    "B'": 'Back counter-clockwise',
    'B2': 'Back 180°',
  };
  
  return moves.map(move => ({
    notation: move,
    description: descriptions[move] || move,
  }));
}
