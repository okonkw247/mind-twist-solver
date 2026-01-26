import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface CubieFaceProps {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
}

const CubieFace = ({ position, rotation, color }: CubieFaceProps) => {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[0.85, 0.85]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
};

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
}

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

interface RubiksCubeProps {
  cubeState?: string[][];
  autoRotate?: boolean;
  size?: number;
}

const RubiksCubeScene = ({ cubeState, autoRotate = true }: RubiksCubeProps) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.3;
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.0005) * 0.1 + 0.3;
    }
  });

  // Default colors for a solved cube
  const defaultColors = {
    white: '#f5f5f5',
    yellow: '#ffd700',
    red: '#dc2626',
    orange: '#f97316',
    blue: '#2563eb',
    green: '#22c55e',
  };

  // Get color from state or use default
  const getColor = (face: string, row: number, col: number): string => {
    if (cubeState && cubeState[getFaceIndex(face)]) {
      const stateColor = cubeState[getFaceIndex(face)][row * 3 + col];
      return stateColor || '#4a4a4a';
    }
    return defaultColors[face as keyof typeof defaultColors] || '#4a4a4a';
  };

  const getFaceIndex = (face: string): number => {
    const faces = ['front', 'right', 'back', 'left', 'top', 'bottom'];
    return faces.indexOf(face);
  };

  // Generate cubies for 3x3 cube
  const cubies = [];
  const positions = [-1, 0, 1];
  
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        // Skip center cubie
        if (x === 1 && y === 1 && z === 1) continue;
        
        const pos: [number, number, number] = [positions[x], positions[y], positions[z]];
        const colors: CubieProps['colors'] = {};
        
        // Assign colors based on position
        if (z === 2) colors.front = getColor('green', 2 - y, x);
        if (z === 0) colors.back = getColor('blue', 2 - y, 2 - x);
        if (y === 2) colors.top = getColor('white', z, x);
        if (y === 0) colors.bottom = getColor('yellow', 2 - z, x);
        if (x === 0) colors.left = getColor('orange', 2 - y, 2 - z);
        if (x === 2) colors.right = getColor('red', 2 - y, z);
        
        cubies.push(
          <Cubie key={`${x}-${y}-${z}`} position={pos} colors={colors} />
        );
      }
    }
  }

  return (
    <group ref={groupRef} rotation={[0.4, -0.5, 0]}>
      {cubies}
    </group>
  );
};

const RubiksCube3D = ({ cubeState, autoRotate = true, size = 200 }: RubiksCubeProps) => {
  return (
    <div style={{ width: size, height: size }} className="cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [4, 3, 4], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <pointLight position={[0, 10, 0]} intensity={0.5} />
        
        <RubiksCubeScene cubeState={cubeState} autoRotate={autoRotate} />
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          autoRotate={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI * 3 / 4}
        />
      </Canvas>
    </div>
  );
};

export default RubiksCube3D;
