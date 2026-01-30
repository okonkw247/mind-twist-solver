// Interactive 3D Cube with clickable facelets and enhanced camera
// Supports manual color input mode and smooth animations

import { useRef, useState, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { CubeMove } from '@/lib/kociembaSolver';

// Color constants with enhanced visuals
const COLORS: Record<string, string> = {
  white: '#f5f5f5',
  yellow: '#ffd700',
  red: '#dc2626',
  orange: '#f97316',
  blue: '#2563eb',
  green: '#22c55e',
  empty: '#2a2a2a',
};

type FaceName = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';

const SOLVED_COLORS: Record<FaceName, string> = {
  U: COLORS.white,
  D: COLORS.yellow,
  L: COLORS.orange,
  R: COLORS.red,
  F: COLORS.green,
  B: COLORS.blue,
};

// Face name to readable
const FACE_NAMES: Record<FaceName, string> = {
  U: 'Top (White)',
  D: 'Bottom (Yellow)',
  L: 'Left (Orange)',
  R: 'Right (Red)',
  F: 'Front (Green)',
  B: 'Back (Blue)',
};

interface CubieData {
  id: string;
  position: [number, number, number];
  colors: Record<FaceName, string | undefined>;
  facelets: { face: FaceName; localIndex: number }[];
}

interface FaceletClick {
  face: FaceName;
  index: number;
  position: THREE.Vector3;
}

// Generate initial cubie data with facelet indices
function generateCubies(cubeState?: Record<string, string[]>): CubieData[] {
  const cubies: CubieData[] = [];
  const positions = [-1, 0, 1];
  
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        if (x === 1 && y === 1 && z === 1) continue;
        
        const pos: [number, number, number] = [positions[x], positions[y], positions[z]];
        const colors: Record<FaceName, string | undefined> = {
          U: undefined, D: undefined, L: undefined, R: undefined, F: undefined, B: undefined
        };
        const facelets: { face: FaceName; localIndex: number }[] = [];
        
        // Calculate facelet indices based on position
        if (z === 2) { // Front face
          const index = (2 - y) * 3 + x;
          colors.F = cubeState?.front?.[index] 
            ? COLORS[cubeState.front[index]] || COLORS.empty 
            : SOLVED_COLORS.F;
          facelets.push({ face: 'F', localIndex: index });
        }
        if (z === 0) { // Back face
          const index = (2 - y) * 3 + (2 - x);
          colors.B = cubeState?.back?.[index] 
            ? COLORS[cubeState.back[index]] || COLORS.empty 
            : SOLVED_COLORS.B;
          facelets.push({ face: 'B', localIndex: index });
        }
        if (y === 2) { // Up face
          const index = z * 3 + x;
          colors.U = cubeState?.up?.[index] 
            ? COLORS[cubeState.up[index]] || COLORS.empty 
            : SOLVED_COLORS.U;
          facelets.push({ face: 'U', localIndex: index });
        }
        if (y === 0) { // Down face
          const index = (2 - z) * 3 + x;
          colors.D = cubeState?.down?.[index] 
            ? COLORS[cubeState.down[index]] || COLORS.empty 
            : SOLVED_COLORS.D;
          facelets.push({ face: 'D', localIndex: index });
        }
        if (x === 0) { // Left face
          const index = (2 - y) * 3 + (2 - z);
          colors.L = cubeState?.left?.[index] 
            ? COLORS[cubeState.left[index]] || COLORS.empty 
            : SOLVED_COLORS.L;
          facelets.push({ face: 'L', localIndex: index });
        }
        if (x === 2) { // Right face
          const index = (2 - y) * 3 + z;
          colors.R = cubeState?.right?.[index] 
            ? COLORS[cubeState.right[index]] || COLORS.empty 
            : SOLVED_COLORS.R;
          facelets.push({ face: 'R', localIndex: index });
        }
        
        cubies.push({ id: `${x}-${y}-${z}`, position: pos, colors, facelets });
      }
    }
  }
  
  return cubies;
}

// Clickable facelet component
const ClickableFacelet = ({ 
  position, 
  rotation, 
  color, 
  onClick, 
  isManualMode,
  isHighlighted 
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  onClick?: () => void;
  isManualMode?: boolean;
  isHighlighted?: boolean;
}) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  
  return (
    <mesh 
      ref={meshRef}
      position={position} 
      rotation={rotation}
      onClick={(e) => {
        if (isManualMode && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onPointerOver={(e) => {
        if (isManualMode) {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <planeGeometry args={[0.85, 0.85]} />
      <meshStandardMaterial 
        color={color} 
        roughness={0.3} 
        metalness={0.1}
        emissive={hovered || isHighlighted ? color : '#000000'}
        emissiveIntensity={hovered ? 0.4 : isHighlighted ? 0.2 : 0}
      />
    </mesh>
  );
};

// Single cubie with clickable faces
const InteractiveCubie = ({ 
  position, 
  colors, 
  facelets,
  isManualMode,
  onFaceletClick,
  highlightedFace
}: { 
  position: [number, number, number]; 
  colors: Record<FaceName, string | undefined>;
  facelets: { face: FaceName; localIndex: number }[];
  isManualMode?: boolean;
  onFaceletClick?: (face: FaceName, index: number) => void;
  highlightedFace?: FaceName;
}) => {
  const offset = 0.51;
  
  const getFaceletProps = (face: FaceName) => {
    const facelet = facelets.find(f => f.face === face);
    return {
      onClick: facelet ? () => onFaceletClick?.(face, facelet.localIndex) : undefined,
      isHighlighted: face === highlightedFace,
    };
  };
  
  return (
    <group position={position}>
      <RoundedBox args={[0.95, 0.95, 0.95]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.6} />
      </RoundedBox>
      
      {colors.F && (
        <ClickableFacelet 
          position={[0, 0, offset]} 
          rotation={[0, 0, 0]} 
          color={colors.F}
          isManualMode={isManualMode}
          {...getFaceletProps('F')}
        />
      )}
      {colors.B && (
        <ClickableFacelet 
          position={[0, 0, -offset]} 
          rotation={[0, Math.PI, 0]} 
          color={colors.B}
          isManualMode={isManualMode}
          {...getFaceletProps('B')}
        />
      )}
      {colors.U && (
        <ClickableFacelet 
          position={[0, offset, 0]} 
          rotation={[-Math.PI / 2, 0, 0]} 
          color={colors.U}
          isManualMode={isManualMode}
          {...getFaceletProps('U')}
        />
      )}
      {colors.D && (
        <ClickableFacelet 
          position={[0, -offset, 0]} 
          rotation={[Math.PI / 2, 0, 0]} 
          color={colors.D}
          isManualMode={isManualMode}
          {...getFaceletProps('D')}
        />
      )}
      {colors.L && (
        <ClickableFacelet 
          position={[-offset, 0, 0]} 
          rotation={[0, -Math.PI / 2, 0]} 
          color={colors.L}
          isManualMode={isManualMode}
          {...getFaceletProps('L')}
        />
      )}
      {colors.R && (
        <ClickableFacelet 
          position={[offset, 0, 0]} 
          rotation={[0, Math.PI / 2, 0]} 
          color={colors.R}
          isManualMode={isManualMode}
          {...getFaceletProps('R')}
        />
      )}
    </group>
  );
};

// Animation state
interface AnimationData {
  axis: 'x' | 'y' | 'z';
  layerValue: number;
  targetAngle: number;
  duration: number;
  startTime: number;
}

// Get axis and layer for a move
function getMoveInfo(move: CubeMove): { axis: 'x' | 'y' | 'z'; layerValue: number; angle: number } {
  const face = move.face as FaceName;
  let axis: 'x' | 'y' | 'z' = 'y';
  let layerValue = 1;
  let angle = Math.PI / 2;
  
  switch (face) {
    case 'R': axis = 'x'; layerValue = 1; break;
    case 'L': axis = 'x'; layerValue = -1; break;
    case 'U': axis = 'y'; layerValue = 1; break;
    case 'D': axis = 'y'; layerValue = -1; break;
    case 'F': axis = 'z'; layerValue = 1; break;
    case 'B': axis = 'z'; layerValue = -1; break;
  }
  
  const baseDirection = (face === 'R' || face === 'U' || face === 'F') ? -1 : 1;
  
  if (move.direction === 'clockwise') {
    angle = baseDirection * Math.PI / 2;
  } else if (move.direction === 'counter-clockwise') {
    angle = -baseDirection * Math.PI / 2;
  } else {
    angle = Math.PI;
  }
  
  return { axis, layerValue, angle };
}

function isInLayer(position: [number, number, number], axis: 'x' | 'y' | 'z', layerValue: number): boolean {
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  return Math.round(position[axisIndex]) === layerValue;
}

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

function rotateColors(
  colors: Record<FaceName, string | undefined>,
  axis: 'x' | 'y' | 'z',
  angle: number
): Record<FaceName, string | undefined> {
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

// Camera controller with zoom and reset
const CameraController = ({ 
  controlsRef 
}: { 
  controlsRef: React.RefObject<any>;
}) => {
  const { camera } = useThree();
  
  useFrame(() => {
    // Auto-center logic if needed
  });
  
  return null;
};

// Main cube scene
interface CubeSceneProps {
  cubies: CubieData[];
  animation: AnimationData | null;
  onAnimationComplete: () => void;
  isManualMode?: boolean;
  onFaceletClick?: (face: FaceName, index: number) => void;
  highlightedFace?: FaceName;
  controlsRef: React.RefObject<any>;
}

const CubeScene = ({ 
  cubies, 
  animation, 
  onAnimationComplete,
  isManualMode,
  onFaceletClick,
  highlightedFace,
  controlsRef
}: CubeSceneProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotatingLayerRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!animation || !rotatingLayerRef.current) return;
    
    const elapsed = performance.now() - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);
    
    // Smooth easing (cubic ease-out)
    const eased = 1 - Math.pow(1 - progress, 3);
    const angle = animation.targetAngle * eased;
    
    const rotation: [number, number, number] = [0, 0, 0];
    const axisIndex = animation.axis === 'x' ? 0 : animation.axis === 'y' ? 1 : 2;
    rotation[axisIndex] = angle;
    
    rotatingLayerRef.current.rotation.set(...rotation);
    
    if (progress >= 1) {
      onAnimationComplete();
    }
  });
  
  // Separate cubies
  const rotatingCubies = animation
    ? cubies.filter(c => isInLayer(c.position, animation.axis, animation.layerValue))
    : [];
  const staticCubies = animation
    ? cubies.filter(c => !isInLayer(c.position, animation.axis, animation.layerValue))
    : cubies;
  
  return (
    <>
      <CameraController controlsRef={controlsRef} />
      
      <group ref={groupRef} rotation={[0.4, -0.5, 0]}>
        {staticCubies.map(cubie => (
          <InteractiveCubie 
            key={cubie.id} 
            position={cubie.position} 
            colors={cubie.colors}
            facelets={cubie.facelets}
            isManualMode={isManualMode}
            onFaceletClick={onFaceletClick}
            highlightedFace={highlightedFace}
          />
        ))}
        
        <group ref={rotatingLayerRef}>
          {rotatingCubies.map(cubie => (
            <InteractiveCubie 
              key={cubie.id} 
              position={cubie.position} 
              colors={cubie.colors}
              facelets={cubie.facelets}
              isManualMode={isManualMode}
              onFaceletClick={onFaceletClick}
              highlightedFace={highlightedFace}
            />
          ))}
        </group>
      </group>
    </>
  );
};

// Public API
export interface InteractiveCubeHandle {
  executeMove: (move: CubeMove, duration?: number) => Promise<void>;
  reset: () => void;
  setCubeState: (state: Record<string, string[]>) => void;
  resetCamera: () => void;
}

interface InteractiveCube3DProps {
  cubeState?: Record<string, string[]>;
  size?: number;
  isManualMode?: boolean;
  onFaceletClick?: (face: FaceName, index: number) => void;
  onMoveComplete?: (move: CubeMove) => void;
  highlightedFace?: FaceName;
  enableZoom?: boolean;
}

const InteractiveCube3D = forwardRef<InteractiveCubeHandle, InteractiveCube3DProps>(
  ({ 
    cubeState: initialState, 
    size = 300, 
    isManualMode = false,
    onFaceletClick,
    onMoveComplete,
    highlightedFace,
    enableZoom = true
  }, ref) => {
    const [cubies, setCubies] = useState<CubieData[]>(() => generateCubies(initialState));
    const [animation, setAnimation] = useState<AnimationData | null>(null);
    const resolveRef = useRef<(() => void) | null>(null);
    const currentMoveRef = useRef<CubeMove | null>(null);
    const controlsRef = useRef<any>(null);
    
    // Update cubies when external state changes
    useMemo(() => {
      if (initialState && !animation) {
        setCubies(generateCubies(initialState));
      }
    }, [initialState, animation]);
    
    const handleAnimationComplete = useCallback(() => {
      if (!animation) return;
      
      setCubies(prev => {
        return prev.map(cubie => {
          if (!isInLayer(cubie.position, animation.axis, animation.layerValue)) {
            return cubie;
          }
          
          const newPosition = rotatePosition(cubie.position, animation.axis, animation.targetAngle);
          const newColors = rotateColors(cubie.colors, animation.axis, animation.targetAngle);
          
          return { ...cubie, position: newPosition, colors: newColors };
        });
      });
      
      setAnimation(null);
      
      if (currentMoveRef.current && onMoveComplete) {
        onMoveComplete(currentMoveRef.current);
      }
      
      if (resolveRef.current) {
        resolveRef.current();
        resolveRef.current = null;
      }
      
      currentMoveRef.current = null;
    }, [animation, onMoveComplete]);
    
    useImperativeHandle(ref, () => ({
      executeMove: (move: CubeMove, duration: number = 400): Promise<void> => {
        return new Promise((resolve) => {
          currentMoveRef.current = move;
          resolveRef.current = resolve;
          
          const { axis, layerValue, angle } = getMoveInfo(move);
          
          setAnimation({
            axis,
            layerValue,
            targetAngle: angle,
            duration,
            startTime: performance.now(),
          });
        });
      },
      
      reset: () => {
        if (resolveRef.current) {
          resolveRef.current();
          resolveRef.current = null;
        }
        currentMoveRef.current = null;
        setAnimation(null);
        setCubies(generateCubies());
      },
      
      setCubeState: (state: Record<string, string[]>) => {
        setCubies(generateCubies(state));
      },
      
      resetCamera: () => {
        if (controlsRef.current) {
          controlsRef.current.reset();
        }
      },
    }));
    
    return (
      <div style={{ width: size, height: size }} className="cursor-grab active:cursor-grabbing touch-none">
        <Canvas camera={{ position: [5, 4, 5], fov: 40 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <directionalLight position={[-10, -10, -5]} intensity={0.4} />
          <pointLight position={[0, 10, 0]} intensity={0.6} />
          
          <CubeScene
            cubies={cubies}
            animation={animation}
            onAnimationComplete={handleAnimationComplete}
            isManualMode={isManualMode}
            onFaceletClick={onFaceletClick}
            highlightedFace={highlightedFace}
            controlsRef={controlsRef}
          />
          
          <OrbitControls
            ref={controlsRef}
            enableZoom={enableZoom}
            enablePan={false}
            minDistance={4}
            maxDistance={12}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI * 5 / 6}
            dampingFactor={0.1}
            rotateSpeed={0.8}
          />
        </Canvas>
      </div>
    );
  }
);

InteractiveCube3D.displayName = 'InteractiveCube3D';

export { COLORS, FACE_NAMES };
export type { FaceName };
export default InteractiveCube3D;
