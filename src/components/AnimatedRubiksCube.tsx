// Animated 3D Rubik's Cube with Move Execution
// Syncs with solver output for visual step-by-step solving

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { CubeMove } from '@/lib/kociembaSolver';

// Color constants
const COLORS: Record<string, string> = {
  white: '#f5f5f5',
  yellow: '#ffd700',
  red: '#dc2626',
  orange: '#f97316',
  blue: '#2563eb',
  green: '#22c55e',
  empty: '#4a4a4a',
};

// Face index mapping
type FaceName = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';

// Initial solved state colors per face
const SOLVED_COLORS: Record<FaceName, string> = {
  U: COLORS.white,
  D: COLORS.yellow,
  L: COLORS.orange,
  R: COLORS.red,
  F: COLORS.green,
  B: COLORS.blue,
};

// Cubie position and colors
interface CubieData {
  id: string;
  position: [number, number, number];
  colors: {
    U?: string;
    D?: string;
    L?: string;
    R?: string;
    F?: string;
    B?: string;
  };
}

// Generate initial cubie data
function generateCubies(): CubieData[] {
  const cubies: CubieData[] = [];
  const positions = [-1, 0, 1];
  
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        // Skip center
        if (x === 1 && y === 1 && z === 1) continue;
        
        const pos: [number, number, number] = [positions[x], positions[y], positions[z]];
        const colors: CubieData['colors'] = {};
        
        // Assign colors based on position
        if (z === 2) colors.F = SOLVED_COLORS.F;
        if (z === 0) colors.B = SOLVED_COLORS.B;
        if (y === 2) colors.U = SOLVED_COLORS.U;
        if (y === 0) colors.D = SOLVED_COLORS.D;
        if (x === 0) colors.L = SOLVED_COLORS.L;
        if (x === 2) colors.R = SOLVED_COLORS.R;
        
        cubies.push({
          id: `${x}-${y}-${z}`,
          position: pos,
          colors,
        });
      }
    }
  }
  
  return cubies;
}

// Cubie face component
const CubieFace = ({ position, rotation, color }: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
}) => (
  <mesh position={position} rotation={rotation}>
    <planeGeometry args={[0.85, 0.85]} />
    <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
  </mesh>
);

// Single cubie component
const Cubie = ({ position, colors }: { position: [number, number, number]; colors: CubieData['colors'] }) => {
  const offset = 0.51;
  
  return (
    <group position={position}>
      <RoundedBox args={[0.95, 0.95, 0.95]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.6} />
      </RoundedBox>
      
      {colors.F && <CubieFace position={[0, 0, offset]} rotation={[0, 0, 0]} color={colors.F} />}
      {colors.B && <CubieFace position={[0, 0, -offset]} rotation={[0, Math.PI, 0]} color={colors.B} />}
      {colors.U && <CubieFace position={[0, offset, 0]} rotation={[-Math.PI / 2, 0, 0]} color={colors.U} />}
      {colors.D && <CubieFace position={[0, -offset, 0]} rotation={[Math.PI / 2, 0, 0]} color={colors.D} />}
      {colors.L && <CubieFace position={[-offset, 0, 0]} rotation={[0, -Math.PI / 2, 0]} color={colors.L} />}
      {colors.R && <CubieFace position={[offset, 0, 0]} rotation={[0, Math.PI / 2, 0]} color={colors.R} />}
    </group>
  );
};

// Get axis and layer info for a move
function getMoveInfo(move: CubeMove): { axis: 'x' | 'y' | 'z'; layerValue: number; angle: number } {
  const face = move.face as FaceName;
  let axis: 'x' | 'y' | 'z' = 'y';
  let layerValue = 1;
  let angle = Math.PI / 2;
  
  // Determine axis and layer
  switch (face) {
    case 'R': axis = 'x'; layerValue = 1; break;
    case 'L': axis = 'x'; layerValue = -1; break;
    case 'U': axis = 'y'; layerValue = 1; break;
    case 'D': axis = 'y'; layerValue = -1; break;
    case 'F': axis = 'z'; layerValue = 1; break;
    case 'B': axis = 'z'; layerValue = -1; break;
  }
  
  // Determine rotation direction
  const baseDirection = (face === 'R' || face === 'U' || face === 'F') ? -1 : 1;
  
  if (move.direction === 'clockwise') {
    angle = baseDirection * Math.PI / 2;
  } else if (move.direction === 'counter-clockwise') {
    angle = -baseDirection * Math.PI / 2;
  } else {
    angle = Math.PI; // double move
  }
  
  return { axis, layerValue, angle };
}

// Check if cubie is in the rotating layer
function isInLayer(position: [number, number, number], axis: 'x' | 'y' | 'z', layerValue: number): boolean {
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  return Math.round(position[axisIndex]) === layerValue;
}

// Rotate a position around an axis
function rotatePosition(
  position: [number, number, number],
  axis: 'x' | 'y' | 'z',
  angle: number
): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [x, y, z] = position;
  
  switch (axis) {
    case 'x':
      return [x, Math.round(y * cos - z * sin), Math.round(y * sin + z * cos)];
    case 'y':
      return [Math.round(x * cos + z * sin), y, Math.round(-x * sin + z * cos)];
    case 'z':
      return [Math.round(x * cos - y * sin), Math.round(x * sin + y * cos), z];
  }
}

// Rotate colors after a move
function rotateColors(
  colors: CubieData['colors'],
  axis: 'x' | 'y' | 'z',
  angle: number
): CubieData['colors'] {
  const steps = Math.round(angle / (Math.PI / 2));
  const absSteps = Math.abs(steps) % 4;
  const direction = steps > 0 ? 1 : -1;
  
  let result = { ...colors };
  
  for (let i = 0; i < absSteps; i++) {
    const prev = { ...result };
    
    if (axis === 'x') {
      if (direction > 0) {
        result = { ...prev, U: prev.F, B: prev.U, D: prev.B, F: prev.D };
      } else {
        result = { ...prev, U: prev.B, F: prev.U, D: prev.F, B: prev.D };
      }
    } else if (axis === 'y') {
      if (direction > 0) {
        result = { ...prev, F: prev.R, L: prev.F, B: prev.L, R: prev.B };
      } else {
        result = { ...prev, F: prev.L, R: prev.F, B: prev.R, L: prev.B };
      }
    } else {
      if (direction > 0) {
        result = { ...prev, U: prev.L, R: prev.U, D: prev.R, L: prev.D };
      } else {
        result = { ...prev, U: prev.R, L: prev.U, D: prev.L, R: prev.D };
      }
    }
  }
  
  return result;
}

// Animation state for the scene
interface AnimationData {
  axis: 'x' | 'y' | 'z';
  layerValue: number;
  targetAngle: number;
  currentAngle: number;
  duration: number;
  startTime: number;
}

// The 3D cube scene
interface CubeSceneProps {
  cubies: CubieData[];
  animation: AnimationData | null;
  onAnimationComplete: () => void;
}

const CubeScene = ({ cubies, animation, onAnimationComplete }: CubeSceneProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotatingLayerRef = useRef<THREE.Group>(null);
  const [currentAngle, setCurrentAngle] = useState(0);
  
  useFrame(() => {
    if (!animation || !rotatingLayerRef.current) return;
    
    const elapsed = performance.now() - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);
    
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const angle = animation.targetAngle * eased;
    
    // Apply rotation based on axis
    const rotation: [number, number, number] = [0, 0, 0];
    const axisIndex = animation.axis === 'x' ? 0 : animation.axis === 'y' ? 1 : 2;
    rotation[axisIndex] = angle;
    
    rotatingLayerRef.current.rotation.set(...rotation);
    setCurrentAngle(angle);
    
    if (progress >= 1) {
      onAnimationComplete();
    }
  });
  
  // Reset rotation when animation ends
  useEffect(() => {
    if (!animation && rotatingLayerRef.current) {
      rotatingLayerRef.current.rotation.set(0, 0, 0);
    }
  }, [animation]);
  
  // Separate cubies into rotating and static
  const rotatingCubies = animation
    ? cubies.filter(c => isInLayer(c.position, animation.axis, animation.layerValue))
    : [];
  const staticCubies = animation
    ? cubies.filter(c => !isInLayer(c.position, animation.axis, animation.layerValue))
    : cubies;
  
  return (
    <group ref={groupRef} rotation={[0.4, -0.5, 0]}>
      {/* Static cubies */}
      {staticCubies.map(cubie => (
        <Cubie key={cubie.id} position={cubie.position} colors={cubie.colors} />
      ))}
      
      {/* Rotating layer */}
      <group ref={rotatingLayerRef}>
        {rotatingCubies.map(cubie => (
          <Cubie key={cubie.id} position={cubie.position} colors={cubie.colors} />
        ))}
      </group>
    </group>
  );
};

// Public interface
export interface AnimatedCubeHandle {
  executeMove: (move: CubeMove, duration: number) => Promise<void>;
  reset: () => void;
}

interface AnimatedRubiksCubeProps {
  cubeState?: string[][];
  size?: number;
  onMoveComplete?: (move: CubeMove) => void;
}

const AnimatedRubiksCube = forwardRef<AnimatedCubeHandle, AnimatedRubiksCubeProps>(
  ({ size = 260, onMoveComplete }, ref) => {
    const [cubies, setCubies] = useState<CubieData[]>(() => generateCubies());
    const [animation, setAnimation] = useState<AnimationData | null>(null);
    const resolveRef = useRef<(() => void) | null>(null);
    const currentMoveRef = useRef<CubeMove | null>(null);
    
    const handleAnimationComplete = useCallback(() => {
      if (!animation) return;
      
      // Update cubie positions and colors after animation
      setCubies(prev => {
        return prev.map(cubie => {
          if (!isInLayer(cubie.position, animation.axis, animation.layerValue)) {
            return cubie;
          }
          
          // Rotate position
          const newPosition = rotatePosition(cubie.position, animation.axis, animation.targetAngle);
          // Rotate colors
          const newColors = rotateColors(cubie.colors, animation.axis, animation.targetAngle);
          
          return {
            ...cubie,
            position: newPosition,
            colors: newColors,
          };
        });
      });
      
      // Clear animation
      setAnimation(null);
      
      // Notify completion
      if (currentMoveRef.current && onMoveComplete) {
        onMoveComplete(currentMoveRef.current);
      }
      
      // Resolve promise
      if (resolveRef.current) {
        resolveRef.current();
        resolveRef.current = null;
      }
      
      currentMoveRef.current = null;
    }, [animation, onMoveComplete]);
    
    // Expose imperative API
    useImperativeHandle(ref, () => ({
      executeMove: (move: CubeMove, duration: number): Promise<void> => {
        return new Promise((resolve) => {
          // Store move and resolver
          currentMoveRef.current = move;
          resolveRef.current = resolve;
          
          // Get move info
          const { axis, layerValue, angle } = getMoveInfo(move);
          
          // Start animation
          setAnimation({
            axis,
            layerValue,
            targetAngle: angle,
            currentAngle: 0,
            duration,
            startTime: performance.now(),
          });
        });
      },
      
      reset: () => {
        // Cancel any in-progress animation
        if (resolveRef.current) {
          resolveRef.current();
          resolveRef.current = null;
        }
        currentMoveRef.current = null;
        setAnimation(null);
        
        // Reset to solved state
        setCubies(generateCubies());
      },
    }));
    
    return (
      <div style={{ width: size, height: size }} className="cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [4, 3, 4], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <pointLight position={[0, 10, 0]} intensity={0.5} />
          
          <CubeScene
            cubies={cubies}
            animation={animation}
            onAnimationComplete={handleAnimationComplete}
          />
          
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI * 3 / 4}
          />
        </Canvas>
      </div>
    );
  }
);

AnimatedRubiksCube.displayName = 'AnimatedRubiksCube';

export default AnimatedRubiksCube;
