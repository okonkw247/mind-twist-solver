/**
 * CubeRenderer3D — Reads from CubeProvider context and renders 3D cube
 *
 * Realistic Rubik's-cube look:
 *   - Pure black matte plastic body
 *   - Official WCA sticker palette
 *   - Inset stickers with thin black gaps
 *
 * Performance:
 *   - Shared geometries & materials
 *   - 2 lights (key + soft fill), no shadows
 *   - Touch gesture support via OrbitControls (when interactive)
 */

import { useRef, useMemo, memo, forwardRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useCubeContext } from '@/cube/CubeProvider';
import type { Cubie, ColorName, Vec3 } from '@/cube/CubeModel';
import type { AnimationFrame } from '@/cube/AnimationController';

// ── Shared geometries & materials (reduce GPU allocations) ───────────────────

// Slightly smaller stickers → thin black gap shows around each one
const PLANE_GEO = new THREE.PlaneGeometry(0.82, 0.82);

// Pure black matte plastic body (real Rubik's cube)
const BODY_MAT = new THREE.MeshStandardMaterial({
  color: '#0a0a0a',
  roughness: 0.85,
  metalness: 0.05,
});

// Official WCA sticker colors, matte vinyl finish
const FACELET_MATS: Record<ColorName, THREE.MeshStandardMaterial> = {
  white:  new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.45, metalness: 0.0 }),
  yellow: new THREE.MeshStandardMaterial({ color: '#FFD500', roughness: 0.45, metalness: 0.0 }),
  red:    new THREE.MeshStandardMaterial({ color: '#C41E3A', roughness: 0.45, metalness: 0.0 }),
  orange: new THREE.MeshStandardMaterial({ color: '#FF5800', roughness: 0.45, metalness: 0.0 }),
  blue:   new THREE.MeshStandardMaterial({ color: '#0051BA', roughness: 0.45, metalness: 0.0 }),
  green:  new THREE.MeshStandardMaterial({ color: '#009E60', roughness: 0.45, metalness: 0.0 }),
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
  // Sticker sits just outside the cubie body to leave the black gap visible
  const offset = 0.502;
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
      <RoundedBox args={[0.96, 0.96, 0.96]} radius={0.06} smoothness={4} material={BODY_MAT} />
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

interface SceneProps {
  cubies: readonly Cubie[];
  animFrame: AnimationFrame | null;
  interactive: boolean;
  autoRotateIdle: boolean;
}

const CubeSceneInner = ({ cubies, animFrame, interactive, autoRotateIdle }: SceneProps) => {
  // Outer wrapper holds the camera tilt; layer rotations happen INSIDE in cube-local space
  const cubeRootRef = useRef<THREE.Group>(null);
  const rotatingGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    // Idle attract spin (only when nothing is animating)
    if (cubeRootRef.current && autoRotateIdle && !animFrame) {
      cubeRootRef.current.rotation.y += delta * 0.35;
    }

    // Per-frame layer rotation (cube-local space — axes align with cube faces)
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
      {/* Realistic lighting: warm key + cool fill, no shadows */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 10, 6]} intensity={1.0} color="#fff5e6" />
      <directionalLight position={[-6, -4, -8]} intensity={0.35} color="#cce0ff" />

      {/* Initial display tilt — shared by static AND rotating layers so face axes stay correct */}
      <group ref={cubeRootRef} rotation={autoRotateIdle ? [0.45, 0, 0] : [0.45, -0.55, 0]}>
        {staticCubies.map((c) => <CubieMesh key={c.id} cubie={c} />)}
        <group ref={rotatingGroupRef}>
          {rotatingCubies.map((c) => <CubieMesh key={c.id} cubie={c} />)}
        </group>
      </group>

      {interactive && (
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
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
        />
      )}
    </>
  );
};

// ── Public component ─────────────────────────────────────────────────────────

interface CubeRenderer3DProps {
  size?: number;
  /** Allow user to orbit/zoom the camera. Default: true. */
  interactive?: boolean;
  /** Slowly spin the whole cube on Y when idle (great for hero displays). Default: false. */
  autoRotateIdle?: boolean;
}

const CubeRenderer3D = forwardRef<HTMLDivElement, CubeRenderer3DProps>(
  ({ size = 260, interactive = true, autoRotateIdle = false }, ref) => {
    const { cubies, animFrame } = useCubeContext();

    return (
      <div
        ref={ref}
        style={{ width: size, height: size }}
        className={
          interactive
            ? 'cursor-grab active:cursor-grabbing touch-none select-none'
            : 'pointer-events-none select-none'
        }
      >
        <Canvas
          camera={{ position: [5, 4, 5], fov: 40 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
          shadows={false}
        >
          <CubeSceneInner
            cubies={cubies}
            animFrame={animFrame}
            interactive={interactive}
            autoRotateIdle={autoRotateIdle}
          />
        </Canvas>
      </div>
    );
  }
);

CubeRenderer3D.displayName = 'CubeRenderer3D';

export default CubeRenderer3D;
