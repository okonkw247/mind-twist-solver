// Animated 3D Rubik's Cube with Move Execution
// Syncs with solver output for visual step-by-step solving

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { CubeMove } from '@/lib/kociembaSolver';

// Animation state
interface AnimationState {
  isAnimating: boolean;
  currentMove: CubeMove | null;
  progress: number; // 0 to 1
}

// Cubie component
interface CubieProps {
  position: [number, number, number];
  colors: {
    front?: string;
    back?: string;
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  groupRef?: React.RefObject<THREE.Group>;
}

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

const Cubie = ({ position, colors }: CubieProps) => {
  const offset = 0.51;
  
  return (
    <group position={position}>
      <RoundedBox args={[0.95, 0.95, 0.95]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.6} />
      </RoundedBox>
      
      {colors.front && (
        <CubieFace position={[0, 0, offset]} rotation={[0, 0, 0]} color={colors.front} />
      )}
      {colors.back && (
        <CubieFace position={[0, 0, -offset]} rotation={[0, Math.PI, 0]} color={colors.back} />
      )}
      {colors.top && (
        <CubieFace position={[0, offset, 0]} rotation={[-Math.PI / 2, 0, 0]} color={colors.top} />
      )}
      {colors.bottom && (
        <CubieFace position={[0, -offset, 0]} rotation={[Math.PI / 2, 0, 0]} color={colors.bottom} />
      )}
      {colors.left && (
        <CubieFace position={[-offset, 0, 0]} rotation={[0, -Math.PI / 2, 0]} color={colors.left} />
      )}
      {colors.right && (
        <CubieFace position={[offset, 0, 0]} rotation={[0, Math.PI / 2, 0]} color={colors.right} />
      )}
    </group>
  );
};

// Color constants
const COLORS = {
  white: '#f5f5f5',
  yellow: '#ffd700',
  red: '#dc2626',
  orange: '#f97316',
  blue: '#2563eb',
  green: '#22c55e',
  empty: '#4a4a4a',
};

// Get rotation axis and direction for a move
function getMoveRotation(move: CubeMove): { axis: 'x' | 'y' | 'z'; direction: number; layers: number[] } {
  const face = move.face;
  let axis: 'x' | 'y' | 'z' = 'y';
  let direction = 1;
  const layers: number[] = [];
  
  switch (face) {
    case 'R':
      axis = 'x';
      direction = move.direction === 'clockwise' ? -1 : 1;
      layers.push(1);
      break;
    case 'L':
      axis = 'x';
      direction = move.direction === 'clockwise' ? 1 : -1;
      layers.push(-1);
      break;
    case 'U':
      axis = 'y';
      direction = move.direction === 'clockwise' ? -1 : 1;
      layers.push(1);
      break;
    case 'D':
      axis = 'y';
      direction = move.direction === 'clockwise' ? 1 : -1;
      layers.push(-1);
      break;
    case 'F':
      axis = 'z';
      direction = move.direction === 'clockwise' ? -1 : 1;
      layers.push(1);
      break;
    case 'B':
      axis = 'z';
      direction = move.direction === 'clockwise' ? 1 : -1;
      layers.push(-1);
      break;
  }
  
  if (move.direction === 'double') {
    direction *= 2;
  }
  
  return { axis, direction, layers };
}

// Main cube scene with animation support
interface CubeSceneProps {
  cubeState?: string[][];
  currentMove: CubeMove | null;
  animationProgress: number;
  onAnimationComplete?: () => void;
}

const AnimatedCubeScene = ({ cubeState, currentMove, animationProgress }: CubeSceneProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotatingLayerRef = useRef<THREE.Group>(null);
  
  // Calculate rotation for current animation
  const rotation = currentMove ? getMoveRotation(currentMove) : null;
  const targetAngle = rotation ? (Math.PI / 2) * rotation.direction : 0;
  const currentAngle = targetAngle * animationProgress;
  
  // Solved cube colors
  const getDefaultColor = (face: string): string => {
    const colorMap: Record<string, string> = {
      front: COLORS.green,
      back: COLORS.blue,
      top: COLORS.white,
      bottom: COLORS.yellow,
      left: COLORS.orange,
      right: COLORS.red,
    };
    return colorMap[face] || COLORS.empty;
  };
  
  // Generate cubies
  const cubies = [];
  const positions = [-1, 0, 1];
  
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        if (x === 1 && y === 1 && z === 1) continue;
        
        const pos: [number, number, number] = [positions[x], positions[y], positions[z]];
        const colors: CubieProps['colors'] = {};
        
        // Determine if this cubie is part of the rotating layer
        const isRotating = rotation && (
          (rotation.axis === 'x' && positions[x] === rotation.layers[0]) ||
          (rotation.axis === 'y' && positions[y] === rotation.layers[0]) ||
          (rotation.axis === 'z' && positions[z] === rotation.layers[0])
        );
        
        // Assign colors
        if (z === 2) colors.front = getDefaultColor('front');
        if (z === 0) colors.back = getDefaultColor('back');
        if (y === 2) colors.top = getDefaultColor('top');
        if (y === 0) colors.bottom = getDefaultColor('bottom');
        if (x === 0) colors.left = getDefaultColor('left');
        if (x === 2) colors.right = getDefaultColor('right');
        
        const cubie = <Cubie key={`${x}-${y}-${z}`} position={pos} colors={colors} />;
        
        if (isRotating && rotation) {
          // This cubie needs to be in the rotating group
          cubies.push({
            element: cubie,
            isRotating: true,
            key: `${x}-${y}-${z}`,
          });
        } else {
          cubies.push({
            element: cubie,
            isRotating: false,
            key: `${x}-${y}-${z}`,
          });
        }
      }
    }
  }
  
  // Calculate rotation euler for the rotating layer
  const getRotationEuler = (): [number, number, number] => {
    if (!rotation) return [0, 0, 0];
    
    switch (rotation.axis) {
      case 'x': return [currentAngle, 0, 0];
      case 'y': return [0, currentAngle, 0];
      case 'z': return [0, 0, currentAngle];
      default: return [0, 0, 0];
    }
  };
  
  const rotatingCubies = cubies.filter(c => c.isRotating);
  const staticCubies = cubies.filter(c => !c.isRotating);
  
  return (
    <group ref={groupRef} rotation={[0.4, -0.5, 0]}>
      {/* Static cubies */}
      {staticCubies.map(c => c.element)}
      
      {/* Rotating layer */}
      <group ref={rotatingLayerRef} rotation={getRotationEuler()}>
        {rotatingCubies.map(c => c.element)}
      </group>
    </group>
  );
};

// Public interface for the animated cube
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
  ({ cubeState, size = 260, onMoveComplete }, ref) => {
    const [animationState, setAnimationState] = useState<AnimationState>({
      isAnimating: false,
      currentMove: null,
      progress: 0,
    });
    
    const animationRef = useRef<{
      startTime: number;
      duration: number;
      resolve: () => void;
    } | null>(null);
    
    // Animation loop
    useEffect(() => {
      if (!animationState.isAnimating || !animationRef.current) return;
      
      const animate = () => {
        if (!animationRef.current) return;
        
        const elapsed = performance.now() - animationRef.current.startTime;
        const progress = Math.min(elapsed / animationRef.current.duration, 1);
        
        // Ease out cubic
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        setAnimationState(prev => ({
          ...prev,
          progress: easedProgress,
        }));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Animation complete
          const move = animationState.currentMove;
          setAnimationState({
            isAnimating: false,
            currentMove: null,
            progress: 0,
          });
          
          if (move) {
            onMoveComplete?.(move);
          }
          
          animationRef.current.resolve();
          animationRef.current = null;
        }
      };
      
      requestAnimationFrame(animate);
    }, [animationState.isAnimating]);
    
    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      executeMove: (move: CubeMove, duration: number): Promise<void> => {
        return new Promise((resolve) => {
          animationRef.current = {
            startTime: performance.now(),
            duration,
            resolve,
          };
          
          setAnimationState({
            isAnimating: true,
            currentMove: move,
            progress: 0,
          });
        });
      },
      
      reset: () => {
        if (animationRef.current) {
          animationRef.current.resolve();
          animationRef.current = null;
        }
        
        setAnimationState({
          isAnimating: false,
          currentMove: null,
          progress: 0,
        });
      },
    }));
    
    return (
      <div style={{ width: size, height: size }} className="cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [4, 3, 4], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <pointLight position={[0, 10, 0]} intensity={0.5} />
          
          <AnimatedCubeScene
            cubeState={cubeState}
            currentMove={animationState.currentMove}
            animationProgress={animationState.progress}
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
