/**
 * Rigid-Body 3D Cube Renderer - FIXED VERSION
 * 
 * This component renders a mathematically correct Rubik's Cube:
 * - Each cubie is a real 3D object with position and orientation
 * - Colors are permanently attached to cubie local faces
 * - Rotations are animated frame-by-frame using requestAnimationFrame
 * - Camera controls remain fully interactive during animations
 * - State is derived from cubie positions/orientations, NOT from color arrays
 * 
 * FIXES APPLIED:
 * 1. Removed double quaternion application (position + orientation)
 * 2. Implemented proper group-based rotation for animating cubies
 * 3. Increased default animation duration for smoother appearance
 */

import { useRef, useState, useCallback, forwardRef, useImperativeHandle, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import {
  RigidCubie,
  ColorName,
  FaceName,
  createSolvedCubies,
  applyMoveToCubies,
  parseMove,
  createMoveQuaternion,
  isInLayer,
  getInverseMove,
  cubiesToFaceArrays,
  cloneCubies,
  getMoveAxis,
} from '@/lib/rigidCubeEngine';

// Color hex values for rendering
const COLOR_HEX: Record<ColorName, string> = {
  white: '#f5f5f5',
  yellow: '#ffd700',
  red: '#dc2626',
  orange: '#f97316',
  blue: '#2563eb',
  green: '#22c55e',
};

// Animation state for a single rotation
interface AnimationState {
  face: FaceName;
  targetAngle: number;
  currentAngle: number;
  startTime: number;
  duration: number;
  notation: string;
  isPaused: boolean;
  pausedAngle: number;
  rotationQuaternion: THREE.Quaternion;
  affectedCubieIds: Set<string>;
}

// Props for a single cubie mesh
interface CubieMeshProps {
  cubie: RigidCubie;
  isClickable?: boolean;
  onFaceletClick?: (face: FaceName, cubieId: string) => void;
}

/**
 * Renders a single cubie with its colors permanently attached
 * FIXED: No longer handles animation rotation - that's done by parent group
 */
const CubieMesh = ({ cubie, isClickable, onFaceletClick }: CubieMeshProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  
  // Render facelets in LOCAL space - they're fixed to the cubie
  const facelets = useMemo(() => {
    const result: JSX.Element[] = [];
    const offset = 0.51;
    
    cubie.localColors.forEach((color, localKey) => {
      const [lx, ly, lz] = localKey.split(',').map(Number);
      
      // Position in local space
      const pos: [number, number, number] = [lx * offset, ly * offset, lz * offset];
      
      // Rotation to face outward from cube center
      let rotation: [number, number, number] = [0, 0, 0];
      if (lz === 1) rotation = [0, 0, 0]; // Front
      if (lz === -1) rotation = [0, Math.PI, 0]; // Back
      if (ly === 1) rotation = [-Math.PI / 2, 0, 0]; // Up
      if (ly === -1) rotation = [Math.PI / 2, 0, 0]; // Down
      if (lx === 1) rotation = [0, Math.PI / 2, 0]; // Right
      if (lx === -1) rotation = [0, -Math.PI / 2, 0]; // Left
      
      // Determine which world face this local face is now pointing to
      const localNormal = new THREE.Vector3(lx, ly, lz);
      const worldNormal = localNormal.clone().applyQuaternion(cubie.orientation);
      let worldFace: FaceName = 'F';
      if (Math.round(worldNormal.z) === 1) worldFace = 'F';
      else if (Math.round(worldNormal.z) === -1) worldFace = 'B';
      else if (Math.round(worldNormal.y) === 1) worldFace = 'U';
      else if (Math.round(worldNormal.y) === -1) worldFace = 'D';
      else if (Math.round(worldNormal.x) === 1) worldFace = 'R';
      else if (Math.round(worldNormal.x) === -1) worldFace = 'L';
      
      const isHovered = hovered === localKey;
      
      result.push(
        <mesh
          key={localKey}
          position={pos}
          rotation={rotation}
          onClick={(e) => {
            if (isClickable && onFaceletClick) {
              e.stopPropagation();
              onFaceletClick(worldFace, cubie.id);
            }
          }}
          onPointerOver={(e) => {
            if (isClickable) {
              e.stopPropagation();
              setHovered(localKey);
              document.body.style.cursor = 'pointer';
            }
          }}
          onPointerOut={() => {
            setHovered(null);
            document.body.style.cursor = 'auto';
          }}
        >
          <planeGeometry args={[0.85, 0.85]} />
          <meshStandardMaterial
            color={COLOR_HEX[color]}
            roughness={0.3}
            metalness={0.1}
            emissive={isHovered ? COLOR_HEX[color] : '#000000'}
            emissiveIntensity={isHovered ? 0.4 : 0}
          />
        </mesh>
      );
    });
    
    return result;
  }, [cubie.localColors, cubie.orientation, cubie.id, hovered, isClickable, onFaceletClick]);
  
  return (
    <group
      ref={meshRef}
      position={[cubie.position.x, cubie.position.y, cubie.position.z]}
      quaternion={cubie.orientation}
    >
      {/* Black cubie body */}
      <RoundedBox args={[0.95, 0.95, 0.95]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.6} />
      </RoundedBox>
      
      {/* Colored facelets - in LOCAL space, fixed to cubie */}
      {facelets}
    </group>
  );
};

// Scene props
interface CubeSceneProps {
  cubies: RigidCubie[];
  animation: AnimationState | null;
  onAnimationComplete: (notation: string) => void;
  isClickable?: boolean;
  onFaceletClick?: (face: FaceName, cubieId: string) => void;
  controlsRef: React.RefObject<any>;
}

/**
 * The 3D scene with continuous rendering
 * FIXED: Uses a rotating group for animating cubies instead of individual rotation
 */
const CubeScene = ({
  cubies,
  animation,
  onAnimationComplete,
  isClickable,
  onFaceletClick,
  controlsRef,
}: CubeSceneProps) => {
  // Reference to the rotating group that holds animating cubies
  const rotatingGroupRef = useRef<THREE.Group>(null);
  
  // Continuous frame updates
  useFrame(() => {
    if (!animation || !rotatingGroupRef.current) {
      if (rotatingGroupRef.current) {
        rotatingGroupRef.current.quaternion.identity();
      }
      return;
    }
    
    // Handle pause
    if (animation.isPaused) {
      // Keep the paused rotation
      const axis = getMoveAxis(animation.face).normalize();
      rotatingGroupRef.current.quaternion.setFromAxisAngle(axis, animation.pausedAngle);
      return;
    }
    
    // Calculate animation progress
    const elapsed = performance.now() - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);
    
    // Cubic ease-out for smooth animation
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentAngle = animation.targetAngle * eased;
    
    // Apply rotation to the GROUP containing all animating cubies
    const axis = getMoveAxis(animation.face).normalize();
    rotatingGroupRef.current.quaternion.setFromAxisAngle(axis, currentAngle);
    
    // Check if animation complete
    if (progress >= 1) {
      onAnimationComplete(animation.notation);
    }
  });
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <directionalLight position={[-10, -10, -5]} intensity={0.4} />
      <pointLight position={[0, 10, 0]} intensity={0.6} />
      
      {/* Cube group with base rotation for nice viewing angle */}
      <group rotation={[0.4, -0.5, 0]}>
        {/* Non-animating cubies - render directly */}
        {cubies.map(cubie => {
          const isAnimating = animation && animation.affectedCubieIds.has(cubie.id);
          if (isAnimating) return null; // Skip animating cubies here
          
          return (
            <CubieMesh
              key={cubie.id}
              cubie={cubie}
              isClickable={isClickable && !animation}
              onFaceletClick={onFaceletClick}
            />
          );
        })}
        
        {/* Animating cubies - inside rotating group */}
        {animation && (
          <group ref={rotatingGroupRef}>
            {cubies.map(cubie => {
              const isAnimating = animation.affectedCubieIds.has(cubie.id);
              if (!isAnimating) return null; // Only render animating cubies here
              
              return (
                <CubieMesh
                  key={cubie.id}
                  cubie={cubie}
                  isClickable={false}
                  onFaceletClick={onFaceletClick}
                />
              );
            })}
          </group>
        )}
      </group>
      
      {/* Camera controls - optimized for both mobile and desktop */}
      <OrbitControls
        ref={controlsRef}
        enableZoom={true}
        enablePan={false}
        minDistance={4}
        maxDistance={15}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI * 5 / 6}
        dampingFactor={0.08}
        rotateSpeed={0.7}
        zoomSpeed={0.6}
        enableDamping={true}
        // Touch controls for mobile
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN
        }}
      />
    </>
  );
};

// Public API
export interface RigidCubeHandle {
  executeMove: (notation: string, duration?: number) => Promise<void>;
  executeMoves: (notations: string[], duration?: number, delayBetween?: number) => Promise<void>;
  reset: () => void;
  getCubeState: () => Record<string, string[]>;
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  isAnimating: () => boolean;
  resetCamera: () => void;
  undoMove: () => Promise<void>;
  getMoveHistory: () => string[];
}

interface RigidCube3DProps {
  size?: number;
  isManualMode?: boolean;
  onFaceletClick?: (face: FaceName, index: number) => void;
  onMoveComplete?: (notation: string) => void;
  enableZoom?: boolean;
  enablePan?: boolean;
}

const RigidCube3D = forwardRef<RigidCubeHandle, RigidCube3DProps>(
  (
    {
      size = 300,
      isManualMode = false,
      onFaceletClick,
      onMoveComplete,
      enableZoom = true,
      enablePan = false,
    },
    ref
  ) => {
    // Core state - single source of truth: the cubies
    const [cubies, setCubies] = useState<RigidCubie[]>(() => createSolvedCubies());
    
    // Animation state
    const [animation, setAnimation] = useState<AnimationState | null>(null);
    const resolveRef = useRef<(() => void) | null>(null);
    const controlsRef = useRef<any>(null);
    
    // Move history for undo
    const moveHistoryRef = useRef<string[]>([]);
    
    // Handle facelet click - convert cubie ID to face index
    const handleFaceletClick = useCallback((face: FaceName, cubieId: string) => {
      if (!onFaceletClick) return;
      
      const cubie = cubies.find(c => c.id === cubieId);
      if (!cubie) return;
      
      const x = Math.round(cubie.position.x);
      const y = Math.round(cubie.position.y);
      const z = Math.round(cubie.position.z);
      
      // Calculate face index from position
      let index = 0;
      switch (face) {
        case 'F': index = (1 - y) * 3 + (x + 1); break;
        case 'B': index = (1 - y) * 3 + (1 - x); break;
        case 'U': index = (z + 1) * 3 + (x + 1); break;
        case 'D': index = (1 - z) * 3 + (x + 1); break;
        case 'L': index = (1 - y) * 3 + (1 - z); break;
        case 'R': index = (1 - y) * 3 + (z + 1); break;
      }
      
      onFaceletClick(face, index);
    }, [cubies, onFaceletClick]);
    
    // Animation complete handler
    const handleAnimationComplete = useCallback((notation: string) => {
      // Apply the move to cube state (rigid body rotation)
      setCubies(prev => applyMoveToCubies(prev, notation));
      
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
      executeMove: (notation: string, duration: number = 600): Promise<void> => {
        return new Promise((resolve) => {
          if (animation) {
            resolve();
            return;
          }
          
          resolveRef.current = resolve;
          const { face, angle } = parseMove(notation);
          
          // Find affected cubies
          const affectedCubieIds = new Set<string>();
          cubies.forEach(cubie => {
            if (isInLayer(cubie.position, face)) {
              affectedCubieIds.add(cubie.id);
            }
          });
          
          setAnimation({
            face,
            targetAngle: angle,
            currentAngle: 0,
            startTime: performance.now(),
            duration,
            notation,
            isPaused: false,
            pausedAngle: 0,
            rotationQuaternion: createMoveQuaternion(face, angle),
            affectedCubieIds,
          });
        });
      },
      
      executeMoves: async (notations: string[], duration: number = 600, delayBetween: number = 100) => {
        for (const notation of notations) {
          await new Promise<void>((resolve) => {
            if (animation) {
              resolve();
              return;
            }
            
            resolveRef.current = resolve;
            const { face, angle } = parseMove(notation);
            
            const affectedCubieIds = new Set<string>();
            cubies.forEach(cubie => {
              if (isInLayer(cubie.position, face)) {
                affectedCubieIds.add(cubie.id);
              }
            });
            
            setAnimation({
              face,
              targetAngle: angle,
              currentAngle: 0,
              startTime: performance.now(),
              duration,
              notation,
              isPaused: false,
              pausedAngle: 0,
              rotationQuaternion: createMoveQuaternion(face, angle),
              affectedCubieIds,
            });
          });
          
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
        setCubies(createSolvedCubies());
        moveHistoryRef.current = [];
      },
      
      getCubeState: () => cubiesToFaceArrays(cubies),
      
      pauseAnimation: () => {
        if (animation && !animation.isPaused) {
          const elapsed = performance.now() - animation.startTime;
          const progress = Math.min(elapsed / animation.duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const pausedAngle = animation.targetAngle * eased;
          
          setAnimation(prev => prev ? { ...prev, isPaused: true, pausedAngle } : null);
        }
      },
      
      resumeAnimation: () => {
        if (animation && animation.isPaused) {
          // Calculate remaining animation
          const progress = Math.abs(animation.pausedAngle / animation.targetAngle);
          const remainingDuration = animation.duration * (1 - progress);
          
          setAnimation(prev => prev ? {
            ...prev,
            isPaused: false,
            startTime: performance.now() - (animation.duration * progress),
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
        
        const inverse = getInverseMove(lastMove);
        
        return new Promise<void>((resolve) => {
          resolveRef.current = () => {
            // Remove the undo move from history (it was added by animation complete)
            moveHistoryRef.current.pop();
            resolve();
          };
          
          const { face, angle } = parseMove(inverse);
          
          const affectedCubieIds = new Set<string>();
          cubies.forEach(cubie => {
            if (isInLayer(cubie.position, face)) {
              affectedCubieIds.add(cubie.id);
            }
          });
          
          setAnimation({
            face,
            targetAngle: angle,
            currentAngle: 0,
            startTime: performance.now(),
            duration: 500,
            notation: inverse,
            isPaused: false,
            pausedAngle: 0,
            rotationQuaternion: createMoveQuaternion(face, angle),
            affectedCubieIds,
          });
        });
      },
      
      getMoveHistory: () => [...moveHistoryRef.current],
    }));
    
    // Use mobile optimization settings
    const { isMobile, settings } = useMobileOptimization();
    
    return (
      <div 
        style={{ width: size, height: size }} 
        className="cursor-grab active:cursor-grabbing select-none"
      >
        <Canvas 
          camera={{ position: [5, 4, 5], fov: 40 }}
          gl={{ 
            antialias: settings.antialias,
            powerPreference: settings.powerPreference,
            alpha: false,
          }}
          dpr={settings.pixelRatio}
          frameloop="demand"
          performance={{ min: 0.5 }}
        >
          <CubeScene
            cubies={cubies}
            animation={animation}
            onAnimationComplete={handleAnimationComplete}
            isClickable={isManualMode}
            onFaceletClick={handleFaceletClick}
            controlsRef={controlsRef}
          />
        </Canvas>
      </div>
    );
  }
);

RigidCube3D.displayName = 'RigidCube3D';

export { COLOR_HEX };
export type { FaceName, ColorName };
export default RigidCube3D;
