/**
 * CubeRenderer3D — Reads from CubeProvider context and renders 3D cube
 *
 * This component bridges CubeModel (pure logic) → Three.js (visual).
 * It reads cubies from context and animFrame for smooth rotation.
 * 
 * NO cube logic lives here. This is a pure rendering component.
 */

import { useRef, useMemo, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useCubeContext } from '@/cube/CubeProvider';
import type { Cubie, FaceName, ColorName, Vec3, Mat3 } from '@/cube/CubeModel';
import type { AnimationFrame } from '@/cube/AnimationController';

// ── Color mapping ────────────────────────────────────────────────────────────

const COLOR_HEX: Record<ColorName, string> = {
  white: '#f5f5f5',
  yellow: '#ffd700',
  red: '#dc2626',
  orange: '#f97316',
  blue: '#2563eb',
  green: '#22c55e',
};

// ── Cubie face rendering ─────────────────────────────────────────────────────

/** Convert Mat3 (row-major 9-array) to a THREE.Matrix4 for quaternion extraction */
function mat3ToQuaternion(m: Mat3): THREE.Quaternion {
  const m4 = new THREE.Matrix4();
  m4.set(
    m[0], m[1], m[2], 0,
    m[3], m[4], m[5], 0,
    m[6], m[7], m[8], 0,
    0,    0,    0,    1,
  );
  const q = new THREE.Quaternion();
  q.setFromRotationMatrix(m4);
  return q;
}

interface CubieMeshProps {
  cubie: Cubie;
}

const CubieMesh = memo(({ cubie }: CubieMeshProps) => {
  const offset = 0.51;
  const q = useMemo(() => mat3ToQuaternion(cubie.orientation), [cubie.orientation]);

  const facelets = useMemo(() => {
    const result: JSX.Element[] = [];

    cubie.localColors.forEach((color, dirKey) => {
      const [lx, ly, lz] = dirKey.split(',').map(Number);
      const pos: [number, number, number] = [lx * offset, ly * offset, lz * offset];

      let rotation: [number, number, number] = [0, 0, 0];
      if (lz === 1) rotation = [0, 0, 0];
      if (lz === -1) rotation = [0, Math.PI, 0];
      if (ly === 1) rotation = [-Math.PI / 2, 0, 0];
      if (ly === -1) rotation = [Math.PI / 2, 0, 0];
      if (lx === 1) rotation = [0, Math.PI / 2, 0];
      if (lx === -1) rotation = [0, -Math.PI / 2, 0];

      result.push(
        <mesh key={dirKey} position={pos} rotation={rotation}>
          <planeGeometry args={[0.85, 0.85]} />
          <meshStandardMaterial color={COLOR_HEX[color]} roughness={0.3} metalness={0.1} />
        </mesh>
      );
    });

    return result;
  }, [cubie.localColors]);

  return (
    <group position={cubie.position as unknown as [number, number, number]} quaternion={q}>
      <RoundedBox args={[0.95, 0.95, 0.95]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.6} />
      </RoundedBox>
      {facelets}
    </group>
  );
});

CubieMesh.displayName = 'CubieMesh';

// ── Scene with animation ─────────────────────────────────────────────────────

const FACE_AXIS_MAP: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const FACE_LAYER_INDEX: Record<string, number> = {
  x: 0, y: 1, z: 2,
};

function isInAnimLayer(pos: Vec3, axis: string, layerValue: number): boolean {
  const idx = FACE_LAYER_INDEX[axis];
  return Math.round(pos[idx]) === layerValue;
}

interface CubeSceneInnerProps {
  cubies: readonly Cubie[];
  animFrame: AnimationFrame | null;
}

const CubeSceneInner = ({ cubies, animFrame }: CubeSceneInnerProps) => {
  const rotatingGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!rotatingGroupRef.current) return;

    if (!animFrame) {
      rotatingGroupRef.current.quaternion.identity();
      return;
    }

    const axisVec = FACE_AXIS_MAP[animFrame.axis];
    rotatingGroupRef.current.quaternion.setFromAxisAngle(axisVec, animFrame.currentAngle);
  });

  // Split cubies into static vs rotating
  const { staticCubies, rotatingCubies } = useMemo(() => {
    if (!animFrame) {
      return { staticCubies: cubies, rotatingCubies: [] as readonly Cubie[] };
    }
    const stat: Cubie[] = [];
    const rot: Cubie[] = [];
    for (const c of cubies) {
      if (isInAnimLayer(c.position, animFrame.axis, animFrame.layerValue)) {
        rot.push(c);
      } else {
        stat.push(c);
      }
    }
    return { staticCubies: stat, rotatingCubies: rot };
  }, [cubies, animFrame?.face, animFrame?.layerValue]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <directionalLight position={[-10, -10, -5]} intensity={0.4} />
      <pointLight position={[0, 10, 0]} intensity={0.6} />

      <group rotation={[0.4, -0.5, 0]}>
        {staticCubies.map((c) => (
          <CubieMesh key={c.id} cubie={c} />
        ))}

        <group ref={rotatingGroupRef}>
          {rotatingCubies.map((c) => (
            <CubieMesh key={c.id} cubie={c} />
          ))}
        </group>
      </group>

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={4}
        maxDistance={15}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={(Math.PI * 5) / 6}
        dampingFactor={0.1}
        rotateSpeed={0.8}
        enableDamping={true}
      />
    </>
  );
};

// ── Public component ─────────────────────────────────────────────────────────

interface CubeRenderer3DProps {
  size?: number;
}

const CubeRenderer3D = ({ size = 260 }: CubeRenderer3DProps) => {
  const { cubies, animFrame, version } = useCubeContext();

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
        <CubeSceneInner cubies={cubies} animFrame={animFrame} />
      </Canvas>
    </div>
  );
};

export default CubeRenderer3D;
