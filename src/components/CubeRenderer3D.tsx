/**
 * CubeRenderer3D — Reads from CubeProvider context and renders 3D cube
 *
 * Optimized for performance:
 * - Reduced light count (no pointLight)
 * - Touch gesture support via OrbitControls
 * - Memo'd cubies to minimize re-renders
 */

import { useRef, useMemo, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useCubeContext } from '@/cube/CubeProvider';
import type { Cubie, ColorName, Vec3 } from '@/cube/CubeModel';
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

// ── Shared geometries & materials (reduce GPU allocations) ───────────────────

const PLANE_GEO = new THREE.PlaneGeometry(0.85, 0.85);
const BODY_MAT = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.4, metalness: 0.6 });

const FACELET_MATS: Record<ColorName, THREE.MeshStandardMaterial> = {
  white: new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.3, metalness: 0.1 }),
  yellow: new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.3, metalness: 0.1 }),
  red: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.3, metalness: 0.1 }),
  orange: new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.3, metalness: 0.1 }),
  blue: new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.3, metalness: 0.1 }),
  green: new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.3, metalness: 0.1 }),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function mat3ToQuaternion(m: import('@/cube/CubeModel').Mat3): THREE.Quaternion {
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

const FACELET_ROTATIONS: Record<string, [number, number, number]> = {
  '0,0,1': [0, 0, 0],
  '0,0,-1': [0, Math.PI, 0],
  '0,1,0': [-Math.PI / 2, 0, 0],
  '0,-1,0': [Math.PI / 2, 0, 0],
  '1,0,0': [0, Math.PI / 2, 0],
  '-1,0,0': [0, -Math.PI / 2, 0],
};

// ── Cubie mesh ───────────────────────────────────────────────────────────────

const CubieMesh = memo(({ cubie }: { cubie: Cubie }) => {
  const offset = 0.51;
  const q = useMemo(() => mat3ToQuaternion(cubie.orientation), [cubie.orientation]);

  const facelets = useMemo(() => {
    const result: JSX.Element[] = [];
    cubie.localColors.forEach((color, dirKey) => {
      const [lx, ly, lz] = dirKey.split(',').map(Number);
      const pos: [number, number, number] = [lx * offset, ly * offset, lz * offset];
      const rotation = FACELET_ROTATIONS[dirKey] || [0, 0, 0];

      result.push(
        <mesh key={dirKey} position={pos} rotation={rotation} geometry={PLANE_GEO} material={FACELET_MATS[color]} />
      );
    });
    return result;
  }, [cubie.localColors]);

  return (
    <group position={cubie.position as unknown as [number, number, number]} quaternion={q}>
      <RoundedBox args={[0.95, 0.95, 0.95]} radius={0.08} smoothness={4} material={BODY_MAT} />
      {facelets}
    </group>
  );
});

CubieMesh.displayName = 'CubieMesh';

// ── Scene ────────────────────────────────────────────────────────────────────

const FACE_AXIS_MAP: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const FACE_LAYER_INDEX: Record<string, number> = { x: 0, y: 1, z: 2 };

function isInAnimLayer(pos: Vec3, axis: string, layerValue: number): boolean {
  return Math.round(pos[FACE_LAYER_INDEX[axis]]) === layerValue;
}

const CubeSceneInner = ({ cubies, animFrame }: { cubies: readonly Cubie[]; animFrame: AnimationFrame | null }) => {
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

  const { staticCubies, rotatingCubies } = useMemo(() => {
    if (!animFrame) return { staticCubies: cubies, rotatingCubies: [] as readonly Cubie[] };
    const stat: Cubie[] = [];
    const rot: Cubie[] = [];
    for (const c of cubies) {
      if (isInAnimLayer(c.position, animFrame.axis, animFrame.layerValue)) rot.push(c);
      else stat.push(c);
    }
    return { staticCubies: stat, rotatingCubies: rot };
  }, [cubies, animFrame?.face, animFrame?.layerValue]);

  return (
    <>
      {/* Optimized lighting: 2 lights only, no pointLight */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[8, 10, 5]} intensity={1.0} />

      <group rotation={[0.4, -0.5, 0]}>
        {staticCubies.map((c) => <CubieMesh key={c.id} cubie={c} />)}
        <group ref={rotatingGroupRef}>
          {rotatingCubies.map((c) => <CubieMesh key={c.id} cubie={c} />)}
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
        // Touch gesture support
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
    </>
  );
};

// ── Public component ─────────────────────────────────────────────────────────

const CubeRenderer3D = ({ size = 260 }: { size?: number }) => {
  const { cubies, animFrame } = useCubeContext();

  return (
    <div
      style={{ width: size, height: size }}
      className="cursor-grab active:cursor-grabbing touch-none select-none"
    >
      <Canvas
        camera={{ position: [5, 4, 5], fov: 40 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <CubeSceneInner cubies={cubies} animFrame={animFrame} />
      </Canvas>
    </div>
  );
};

export default CubeRenderer3D;
