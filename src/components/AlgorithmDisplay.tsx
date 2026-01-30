// Visual Algorithm Display with Arrows
// Shows moves like (↓ + ↓ + ↑ + ↑) × 3 as seen in the reference image

import { motion } from 'framer-motion';
import { CubeMove } from '@/lib/kociembaSolver';

// Arrow mapping for each face
const MOVE_ARROWS: Record<string, { arrow: string; label: string }> = {
  'U': { arrow: '↑', label: 'U' },
  "U'": { arrow: '↓', label: "U'" },
  'U2': { arrow: '⇈', label: 'U2' },
  'D': { arrow: '↓', label: 'D' },
  "D'": { arrow: '↑', label: "D'" },
  'D2': { arrow: '⇊', label: 'D2' },
  'R': { arrow: '→', label: 'R' },
  "R'": { arrow: '←', label: "R'" },
  'R2': { arrow: '⇉', label: 'R2' },
  'L': { arrow: '←', label: 'L' },
  "L'": { arrow: '→', label: "L'" },
  'L2': { arrow: '⇇', label: 'L2' },
  'F': { arrow: '⟳', label: 'F' },
  "F'": { arrow: '⟲', label: "F'" },
  'F2': { arrow: '↻', label: 'F2' },
  'B': { arrow: '⟲', label: 'B' },
  "B'": { arrow: '⟳', label: "B'" },
  'B2': { arrow: '↺', label: 'B2' },
};

// Face colors for visual distinction
const FACE_COLORS: Record<string, string> = {
  'U': 'bg-white/90 text-gray-900',
  'D': 'bg-yellow-400 text-gray-900',
  'R': 'bg-red-500 text-white',
  'L': 'bg-orange-500 text-white',
  'F': 'bg-green-500 text-white',
  'B': 'bg-blue-500 text-white',
};

interface MoveGroup {
  moves: CubeMove[];
  repetitions: number;
}

// Group repeated sequences
function groupMoves(moves: CubeMove[]): MoveGroup[] {
  if (moves.length === 0) return [];
  
  const groups: MoveGroup[] = [];
  let i = 0;
  
  while (i < moves.length) {
    // Try to find repeating patterns (2-6 moves)
    let foundPattern = false;
    
    for (let patternLen = 2; patternLen <= 6 && patternLen <= moves.length - i; patternLen++) {
      const pattern = moves.slice(i, i + patternLen);
      let repetitions = 1;
      let j = i + patternLen;
      
      // Count how many times this pattern repeats
      while (j + patternLen <= moves.length) {
        const nextGroup = moves.slice(j, j + patternLen);
        const matches = pattern.every((m, idx) => m.notation === nextGroup[idx].notation);
        
        if (matches) {
          repetitions++;
          j += patternLen;
        } else {
          break;
        }
      }
      
      // Only group if pattern repeats at least twice
      if (repetitions >= 2) {
        groups.push({ moves: pattern, repetitions });
        i = j;
        foundPattern = true;
        break;
      }
    }
    
    // No pattern found, add single move
    if (!foundPattern) {
      groups.push({ moves: [moves[i]], repetitions: 1 });
      i++;
    }
  }
  
  return groups;
}

interface AlgorithmDisplayProps {
  moves: CubeMove[];
  currentStep: number;
  showArrows?: boolean;
  compact?: boolean;
}

const AlgorithmDisplay = ({ 
  moves, 
  currentStep, 
  showArrows = true,
  compact = false 
}: AlgorithmDisplayProps) => {
  const groups = groupMoves(moves);
  
  // Calculate which move is current within groups
  let globalIndex = 0;
  
  return (
    <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-primary/30">
      <div className={`flex items-center gap-1 ${compact ? 'gap-0.5' : 'gap-2'} min-w-max px-2`}>
        {groups.map((group, groupIdx) => {
          const groupStartIndex = globalIndex;
          const groupEndIndex = groupStartIndex + (group.moves.length * group.repetitions);
          const isGroupActive = currentStep >= groupStartIndex && currentStep < groupEndIndex;
          
          const result = (
            <motion.div
              key={groupIdx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: groupIdx * 0.02 }}
              className={`flex items-center ${
                group.repetitions > 1 
                  ? 'border-2 border-primary/50 rounded-xl px-2 py-1 bg-primary/10' 
                  : ''
              }`}
            >
              {group.repetitions > 1 && (
                <span className="text-lg text-muted-foreground mr-1">(</span>
              )}
              
              {group.moves.map((move, moveIdx) => {
                const absoluteIndex = groupStartIndex + moveIdx;
                const isActive = Math.floor((currentStep - groupStartIndex) % group.moves.length) === moveIdx 
                  && isGroupActive;
                const isCompleted = currentStep > absoluteIndex 
                  || (group.repetitions > 1 && currentStep >= groupEndIndex);
                
                const moveInfo = MOVE_ARROWS[move.notation] || { arrow: '?', label: move.notation };
                const faceColor = FACE_COLORS[move.face] || 'bg-muted text-foreground';
                
                return (
                  <div key={moveIdx} className="flex items-center">
                    {moveIdx > 0 && group.repetitions > 1 && (
                      <span className="text-muted-foreground mx-1">+</span>
                    )}
                    
                    <motion.div
                      animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ repeat: isActive ? Infinity : 0, duration: 0.8 }}
                      className={`flex flex-col items-center ${compact ? 'min-w-[36px]' : 'min-w-[44px]'}`}
                    >
                      {/* Arrow */}
                      {showArrows && (
                        <span className={`text-xl ${
                          isActive 
                            ? 'text-primary animate-pulse' 
                            : isCompleted 
                              ? 'text-green-500' 
                              : 'text-muted-foreground'
                        }`}>
                          {moveInfo.arrow}
                        </span>
                      )}
                      
                      {/* Move notation badge */}
                      <div 
                        className={`${compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'} rounded-md font-mono font-bold transition-all ${
                          isActive 
                            ? `${faceColor} ring-2 ring-primary ring-offset-2 ring-offset-background` 
                            : isCompleted 
                              ? 'bg-green-500/30 text-green-400' 
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {move.notation}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
              
              {group.repetitions > 1 && (
                <>
                  <span className="text-lg text-muted-foreground ml-1">)</span>
                  <span className="text-sm font-bold text-primary ml-1">×{group.repetitions}</span>
                </>
              )}
            </motion.div>
          );
          
          globalIndex = groupEndIndex;
          return result;
        })}
      </div>
    </div>
  );
};

// Compact single-line version
export const CompactAlgorithmDisplay = ({ 
  moves, 
  currentStep 
}: { 
  moves: CubeMove[]; 
  currentStep: number; 
}) => {
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {moves.map((move, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const faceColor = FACE_COLORS[move.face] || 'bg-muted';
        
        return (
          <motion.button
            key={index}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`px-2 py-1 rounded font-mono text-sm transition-all ${
              isActive
                ? `${faceColor} ring-2 ring-primary scale-110`
                : isCompleted
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {move.notation}
          </motion.button>
        );
      })}
    </div>
  );
};

export default AlgorithmDisplay;
