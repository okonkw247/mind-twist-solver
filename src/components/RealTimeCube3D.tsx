// Real-Time 3D Cube Engine
// Continuous rendering with frame-based animation and independent camera controls
// Supports: scramble, solve, play, manual input - all using the same state model

import { useRef, useState, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import {
  CubieState,
  FaceName,
  ColorName,
  generateSolvedCubies,
  facesToCubies,
  cubiesToFaces,
  getMoveInfo,
  isInLayer,
  rotatePosition,
  rotateColors,
  applyMove,
  getInverseNotation,
} from '@/lib/cubeStateManager';

// Color hex values
const COLOR_HEX: Record<ColorName, string> = {
  white: '#f5f5f5',
  yellow: '#ffd700',
  red: '#dc2626',
  orange: '#f97316',
  blue: '#2563eb',
  green: '#22c55e',
  empty: '#2a2a2a',
};

// Animation state
interface AnimationState {
  axis: 'x' | 'y' | 'z';
  layerValue: number;
  targetAngle: number;
  currentAngle: number;
  startTime: number;
  duration: number;
  notation: string;
  isPaused: boolean;
  pausedProgress: number;
}

// Facelet component for clickable faces
interface FaceletProps {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  onClick?: () => void;
  isClickable?: boolean;
  isHighlighted?: boolean;
}

const Facelet = ({ position, rotation, color, onClick, isClickable, isHighlighted }: FaceletProps) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={(e) => {
        if (isClickable && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onPointerOver={(e) => {
        if (isClickable) {
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

// Single cubie with all faces
interface CubieProps {
  cubie: CubieState;
  isClickable?: boolean;
  onFaceletClick?: (face: FaceName, cubieId: string) => void;
  highlightedFace?: FaceName;
}

const Cubie = ({ cubie, isClickable, onFaceletClick, highlightedFace }: CubieProps) => {
  const offset = 0.51;
  
  const getFaceColor = (face: FaceName) => {
    const colorName = cubie.colors[face];
    return colorName ? COLOR_HEX[colorName] : undefined;
  };
  
  return (
    <group position={cubie.position}>
      <RoundedBox args={[0.95, 0.95, 0.95]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.6} />
      </RoundedBox>
      
      {cubie.colors.F && (
        <Facelet
          position={[0, 0, offset]}
          rotation={[0, 0, 0]}
          color={getFaceColor('F')!}
          isClickable={isClickable}
          onClick={() => onFaceletClick?.('F', cubie.id)}
          isHighlighted={highlightedFace === 'F'}
        />
      )}
      {cubie.colors.B && (
        <Facelet
          position={[0, 0, -offset]}
          rotation={[0, Math.PI, 0]}
          color={getFaceColor('B')!}
          isClickable={isClickable}
          onClick={() => onFaceletClick?.('B', cubie.id)}
          isHighlighted={highlightedFace === 'B'}
        />
      )}
      {cubie.colors.U && (
        <Facelet
          position={[0, offset, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          color={getFaceColor('U')!}
          isClickable={isClickable}
          onClick={() => onFaceletClick?.('U', cubie.id)}
          isHighlighted={highlightedFace === 'U'}
        />
      )}
      {cubie.colors.D && (
        <Facelet
          position={[0, -offset, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          color={getFaceColor('D')!}
          isClickable={isClickable}
          onClick={() => onFaceletClick?.('D', cubie.id)}
          isHighlighted={highlightedFace === 'D'}
        />
      )}
      {cubie.colors.L && (
        <Facelet
          position={[-offset, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          color={getFaceColor('L')!}
          isClickable={isClickable}
          onClick={() => onFaceletClick?.('L', cubie.id)}
          isHighlighted={highlightedFace === 'L'}
        />
      )}
      {cubie.colors.R && (
        <Facelet
          position={[offset, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          color={getFaceColor('R')!}
          isClickable={isClickable}
          onClick={() => onFaceletClick?.('R', cubie.id)}
          isHighlighted={highlightedFace === 'R'}
        />
      )}
    </group>
  );
};

// The 3D scene with continuous frame updates
interface CubeSceneProps {
  cubies: CubieState[];
  animation: AnimationState | null;
  onAnimationComplete: (notation: string) => void;
  isClickable?: boolean;
  onFaceletClick?: (face: FaceName, cubieId: string) => void;
  highlightedFace?: FaceName;
  controlsRef: React.RefObject<any>;
}

const CubeScene = ({
  cubies,
  animation,
  onAnimationComplete,
  isClickable,
  onFaceletClick,
  highlightedFace,
  controlsRef,
}: CubeSceneProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotatingLayerRef = useRef<THREE.Group>(null);
  
  // Continuous frame updates - this never stops
  useFrame(() => {
    if (!animation || !rotatingLayerRef.current) {
      // Reset rotation when no animation
      if (rotatingLayerRef.current) {
        rotatingLayerRef.current.rotation.set(0, 0, 0);
      }
      return;
    }
    
    // Skip if paused
    if (animation.isPaused) {
      const angle = animation.targetAngle * animation.pausedProgress;
      const rotation: [number, number, number] = [0, 0, 0];
      const axisIndex = animation.axis === 'x' ? 0 : animation.axis === 'y' ? 1 : 2;
      rotation[axisIndex] = angle;
      rotatingLayerRef.current.rotation.set(...rotation);
      return;
    }
    
    // Calculate animation progress
    const elapsed = performance.now() - animation.startTime;
    const adjustedElapsed = elapsed + (animation.pausedProgress * animation.duration);
    const progress = Math.min(adjustedElapsed / animation.duration, 1);
    
    // Smooth cubic ease-out
    const eased = 1 - Math.pow(1 - progress, 3);
    const angle = animation.targetAngle * eased;
    
    // Apply rotation
    const rotation: [number, number, number] = [0, 0, 0];
    const axisIndex = animation.axis === 'x' ? 0 : animation.axis === 'y' ? 1 : 2;
    rotation[axisIndex] = angle;
    rotatingLayerRef.current.rotation.set(...rotation);
    
    // Complete animation
    if (progress >= 1) {
      onAnimationComplete(animation.notation);
    }
  });
  
  // Separate cubies into static and rotating
  const rotatingCubies = animation
    ? cubies.filter(c => isInLayer(c.position, animation.axis, animation.layerValue))
    : [];
  const staticCubies = animation
    ? cubies.filter(c => !isInLayer(c.position, animation.axis, animation.layerValue))
    : cubies;
  
  return (
    <>
      {/* Lighting - always active */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <directionalLight position={[-10, -10, -5]} intensity={0.4} />
      <pointLight position={[0, 10, 0]} intensity={0.6} />
      
      {/* Cube group with base rotation */}
      <group ref={groupRef} rotation={[0.4, -0.5, 0]}>
        {/* Static cubies */}
        {staticCubies.map(cubie => (
          <Cubie
            key={cubie.id}
            cubie={cubie}
            isClickable={isClickable}
            onFaceletClick={onFaceletClick}
            highlightedFace={highlightedFace}
          />
        ))}
        
        {/* Rotating layer */}
        <group ref={rotatingLayerRef}>
          {rotatingCubies.map(cubie => (
            <Cubie
              key={cubie.id}
              cubie={cubie}
              isClickable={isClickable}
              onFaceletClick={onFaceletClick}
              highlightedFace={highlightedFace}
            />
          ))}
        </group>
      </group>
      
      {/* Camera controls - always interactive, independent of animation */}
      <OrbitControls
        ref={controlsRef}
        enableZoom={true}
        enablePan={true}
        minDistance={4}
        maxDistance={15}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI * 5 / 6}
        dampingFactor={0.1}
        rotateSpeed={0.8}
        zoomSpeed={0.8}
        panSpeed={0.5}
        enableDamping={true}
      />
    </>
  );
};

// Public API
export interface RealTimeCubeHandle {
  // Move execution
  executeMove: (notation: string, duration?: number) => Promise<void>;
  executeMoves: (notations: string[], duration?: number, delayBetween?: number) => Promise<void>;
  
  // State management
  reset: () => void;
  setCubeState: (faceState: Record<string, string[]>) => void;
  getCubeState: () => Record<string, string[]>;
  
  // Animation control
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  isAnimating: () => boolean;
  
  // Camera
  resetCamera: () => void;
  
  // Undo/redo
  undoMove: () => Promise<void>;
  getMoveHistory: () => string[];
}

interface RealTimeCube3DProps {
  size?: number;
  initialState?: Record<string, string[]>;
  isManualMode?: boolean;
  onFaceletClick?: (face: FaceName, index: number) => void;
  onMoveComplete?: (notation: string) => void;
  highlightedFace?: FaceName;
  enableZoom?: boolean;
  enablePan?: boolean;
}

const RealTimeCube3D = forwardRef<RealTimeCubeHandle, RealTimeCube3DProps>(
  (
    {
      size = 300,
      initialState,
      isManualMode = false,
      onFaceletClick,
      onMoveComplete,
      highlightedFace,
      enableZoom = true,
      enablePan = false,
    },
    ref
  ) => {
    // Core state - single source of truth
    const [cubies, setCubies] = useState<CubieState[]>(() => 
      initialState ? facesToCubies(initialState) : generateSolvedCubies()
    );
    
    // Animation state
    const [animation, setAnimation] = useState<AnimationState | null>(null);
    const resolveRef = useRef<(() => void) | null>(null);
    const controlsRef = useRef<any>(null);
    
    // Move history for undo
    const moveHistoryRef = useRef<string[]>([]);
    
    // Update cubies when external state changes (manual mode)
    useEffect(() => {
      if (initialState && !animation) {
        setCubies(facesToCubies(initialState));
      }
    }, [initialState, animation]);
    
    // Handle facelet click - convert to face index
    const handleFaceletClick = useCallback((face: FaceName, cubieId: string) => {
      if (!onFaceletClick) return;
      
      const cubie = cubies.find(c => c.id === cubieId);
      if (!cubie) return;
      
      // Calculate face index from cubie position
      const [x, y, z] = cubie.position;
      const xIdx = x + 1;
      const yIdx = y + 1;
      const zIdx = z + 1;
      
      let index = 0;
      switch (face) {
        case 'F': index = (2 - yIdx) * 3 + xIdx; break;
        case 'B': index = (2 - yIdx) * 3 + (2 - xIdx); break;
        case 'U': index = zIdx * 3 + xIdx; break;
        case 'D': index = (2 - zIdx) * 3 + xIdx; break;
        case 'L': index = (2 - yIdx) * 3 + (2 - zIdx); break;
        case 'R': index = (2 - yIdx) * 3 + zIdx; break;
      }
      
      onFaceletClick(face, index);
    }, [cubies, onFaceletClick]);
    
    // Animation complete handler
    const handleAnimationComplete = useCallback((notation: string) => {
      // Apply the move to cube state
      setCubies(prev => applyMove(prev, notation));
      
      // Clear animation
      setAnimation(null);
      
      // Add to history
      moveHistoryRef.current.push(notation);
      
      // Notify
      onMoveComplete?.(notation);
      
      // Resolve promise
      if (resolveRef.current) {
        resolveRef.current();
        resolveRef.current = null;
      }
    }, [onMoveComplete]);
    
    // Expose imperative API
    useImperativeHandle(ref, () => ({
      executeMove: (notation: string, duration: number = 400): Promise<void> => {
        return new Promise((resolve) => {
          // If already animating, queue or reject
          if (animation) {
            resolve();
            return;
          }
          
          resolveRef.current = resolve;
          const { axis, layerValue, angle } = getMoveInfo(notation);
          
          setAnimation({
            axis,
            layerValue,
            targetAngle: angle,
            currentAngle: 0,
            startTime: performance.now(),
            duration,
            notation,
            isPaused: false,
            pausedProgress: 0,
          });
        });
      },
      
      executeMoves: async (notations: string[], duration: number = 400, delayBetween: number = 100) => {
        for (const notation of notations) {
          await new Promise<void>((resolve) => {
            if (animation) {
              resolve();
              return;
            }
            
            resolveRef.current = resolve;
            const { axis, layerValue, angle } = getMoveInfo(notation);
            
            setAnimation({
              axis,
              layerValue,
              targetAngle: angle,
              currentAngle: 0,
              startTime: performance.now(),
              duration,
              notation,
              isPaused: false,
              pausedProgress: 0,
            });
          });
          
          // Delay between moves
          if (delayBetween > 0) {
            await new Promise(r => setTimeout(r, delayBetween));
          }
        }
      },
      
      reset: () => {
        if (resolveRef.current) {
          resolveRef.current();
          resolveRef.current = null;
        }
        setAnimation(null);
        setCubies(generateSolvedCubies());
        moveHistoryRef.current = [];
      },
      
      setCubeState: (faceState: Record<string, string[]>) => {
        setCubies(facesToCubies(faceState));
        moveHistoryRef.current = [];
      },
      
      getCubeState: () => cubiesToFaces(cubies),
      
      pauseAnimation: () => {
        if (animation && !animation.isPaused) {
          const elapsed = performance.now() - animation.startTime;
          const progress = Math.min(elapsed / animation.duration, 1);
          setAnimation(prev => prev ? { ...prev, isPaused: true, pausedProgress: progress } : null);
        }
      },
      
      resumeAnimation: () => {
        if (animation && animation.isPaused) {
          setAnimation(prev => prev ? {
            ...prev,
            isPaused: false,
            startTime: performance.now(),
          } : null);
        }
      },
      
      isAnimating: () => animation !== null,
      
      resetCamera: () => {
        controlsRef.current?.reset();
      },
      
      undoMove: async () => {
        const lastMove = moveHistoryRef.current.pop();
        if (!lastMove) return;
        
        const inverse = getInverseNotation(lastMove);
        
        return new Promise<void>((resolve) => {
          resolveRef.current = () => {
            // Remove the undo move from history
            moveHistoryRef.current.pop();
            resolve();
          };
          
          const { axis, layerValue, angle } = getMoveInfo(inverse);
          
          setAnimation({
            axis,
            layerValue,
            targetAngle: angle,
            currentAngle: 0,
            startTime: performance.now(),
            duration: 300,
            notation: inverse,
            isPaused: false,
            pausedProgress: 0,
          });
        });
      },
      
      getMoveHistory: () => [...moveHistoryRef.current],
    }));
    
    return (
      <div 
        style={{ width: size, height: size }} 
        className="cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <Canvas 
          camera={{ position: [5, 4, 5], fov: 40 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
        >
          <CubeScene
            cubies={cubies}
            animation={animation}
            onAnimationComplete={handleAnimationComplete}
            isClickable={isManualMode}
            onFaceletClick={handleFaceletClick}
            highlightedFace={highlightedFace}
            controlsRef={controlsRef}
          />
        </Canvas>
      </div>
    );
  }
);

RealTimeCube3D.displayName = 'RealTimeCube3D';

export { COLOR_HEX };
export type { FaceName, ColorName };
export default RealTimeCube3D;
