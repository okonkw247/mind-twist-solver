/**
 * CubeRenderer3D — REBUILD STEP 1: pure shape + camera orbit only.
 * No face-turning yet. We confirm the look is right before adding
 * any gesture/rotation logic back in.
 */

import { useRef, useMemo, memo, forwardRef, useEffect, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useCubeContext } from '@/cube/CubeProvider';
import { useCubeSettings } from '@/cube/CubeSettings';
import type { Cubie, ColorName, Vec3, Mat3 } from '@/cube/CubeModel';
import type { AnimationFrame } from '@/cube/AnimationController';

// ── Geometry constants (all derived from one another, so they always match) ──
const BODY_SIZE = 0.86;        // black plastic cubie body, edge length
const BODY_RADIUS = 0.11;      // corner rounding
const FLAT_FACE_WIDTH = BODY_SIZE - BODY_RADIUS * 2; // usable flat area per face
const STICKER_MARGIN = 0.88;   // sticker fills 88% of the flat area — leaves a clean black border, follows the curve naturally
const STICKER_SIZE = FLAT_FACE_WIDTH * STICKER_MARGIN;
const STICKER_LIFT = 0.001;    // avoid z-fighting with the body surface

const PLANE_GEO = new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE);

const BODY_MAT = new THREE.MeshStandardMaterial({
  color: '#0a0a0a',
  roughness: 0.5,
  metalness: 0.1,
});

const FACELET_MATS: Record<ColorName, THREE.MeshStandardMaterial> = {
  white:  new THREE.MeshStandardMaterial({ color: '#FAFAFA', roughness: 0.4, metalness: 0.02 }),
  yellow: new THREE.MeshStandardMaterial({ color: '#FFDE00', roughness: 0.4, metalness: 0.02 }),
  red:    new THREE.MeshStandardMaterial({ color: '#E0201A', roughness: 0.4, metalness: 0.02 }),
  orange: new THREE.MeshStandardMaterial({ color: '#FF7A00', roughness: 0.4, metalness: 0.02 }),
  blue:   new THREE.MeshStandardMaterial({ color: '#0057D9', roughness: 0.4, metalness: 0.02 }),
  green:  new THREE.MeshStandardMaterial({ color: '#00B04F', roughness: 0.4, metalness: 0.02 }),
};

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

const FACELET_ROTATIONS: Record<string, [number, number, number]> = {
  '0,0,1':  [0, 0, 0],
  '0,0,-1': [0, Math.PI, 0],
  '0,1,0':  [-Math.PI / 2, 0, 0],
  '0,-1,0': [Math.PI / 2, 0, 0],
  '1,0,0':  [0, Math.PI / 2, 0],
  '-1,0,0': [0, -Math.PI / 2, 0],
};

const FACE_AXIS_MAP: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const FACE_LAYER_INDEX: Record<string, number> = { x: 0, y: 1, z: 2 };

function isInAnimLayer(pos: Vec3, axis: string, layerValue: number): boolean {
  return Math.round(pos[FACE_LAYER_INDEX[axis]]) === layerValue;
}

interface CubieMeshProps {
  cubie: Cubie;
  animFrameRef: React.RefObject<AnimationFrame | null>;
}

const CubieMesh = memo(({ cubie, animFrameRef }: CubieMeshProps) => {
  // Sticker sits just off the body's face (half body size + tiny lift)
  const offset = BODY_SIZE / 2 + STICKER_LIFT;
  const groupRef = useRef<THREE.Group>(null);

  const facelets = useMemo(() => {
    const result: JSX.Element[] = [];
    cubie.localColors.forEach((color, dirKey) => {
      const [lx, ly, lz] = dirKey.split(',').map(Number);
      const pos: [number, number, number] = [lx * offset, ly * offset, lz * offset];
      const rotation = FACELET_ROTATIONS[dirKey] || [0, 0, 0];
      result.push(
        <mesh key={dirKey} position={pos} rotation={rotation} geometry={PLANE_GEO} material={FACELET_MATS[color]} />,
      );
    });
    return result;
  }, [cubie.localColors, offset]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;

    const animFrame = animFrameRef.current;
    const basePos = new THREE.Vector3(cubie.position[0], cubie.position[1], cubie.position[2]);
    const baseQuat = mat3ToQuaternion(cubie.orientation);

    if (animFrame && isInAnimLayer(cubie.position, animFrame.axis, animFrame.layerValue)) {
      const axisVec = FACE_AXIS_MAP[animFrame.axis];
      const turnQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, animFrame.currentAngle);
      g.position.copy(basePos.applyQuaternion(turnQuat));
      g.quaternion.copy(turnQuat).multiply(baseQuat);
    } else {
      g.position.copy(basePos);
      g.quaternion.copy(baseQuat);
    }
  });

  return (
    <group ref={groupRef}>
      <RoundedBox args={[BODY_SIZE, BODY_SIZE, BODY_SIZE]} radius={BODY_RADIUS} smoothness={6} material={BODY_MAT} />
      {facelets}
    </group>
  );
});
CubieMesh.displayName = 'CubieMesh';

const DEFAULT_CAM_POS = new THREE.Vector3(8, 6.5, 8);
const FRONT_CAM_POS = new THREE.Vector3(0, 0, 11);
const TOP_CAM_POS = new THREE.Vector3(0, 11, 0.01);
const MIN_DIST = 3;
const MAX_DIST = 26;

export interface CubeRenderer3DHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  viewFront: () => void;
  viewTop: () => void;
}

interface CameraApiRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  viewFront: () => void;
  viewTop: () => void;
}

interface SceneProps {
  cubies: readonly Cubie[];
  animFrameRef: React.RefObject<AnimationFrame | null>;
  interactive: boolean;
  autoRotateIdle: boolean;
  apiRef: React.MutableRefObject<CameraApiRef | null>;
}

const CubeSceneInner = ({ cubies, animFrameRef, interactive, autoRotateIdle, apiRef }: SceneProps) => {
  const cubeRootRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  useEffect(() => {
    apiRef.current = {
      zoomIn: () => {
        const controls = controlsRef.current;
        if (!controls) return;
        const dir = camera.position.clone().sub(controls.target);
        const dist = Math.max(MIN_DIST, dir.length() * 0.8);
        camera.position.copy(controls.target).add(dir.normalize().multiplyScalar(dist));
        controls.update();
      },
      zoomOut: () => {
        const controls = controlsRef.current;
        if (!controls) return;
        const dir = camera.position.clone().sub(controls.target);
        const dist = Math.min(MAX_DIST, dir.length() * 1.25);
        camera.position.copy(controls.target).add(dir.normalize().multiplyScalar(dist));
        controls.update();
      },
      resetView: () => {
        const controls = controlsRef.current;
        camera.position.copy(DEFAULT_CAM_POS);
        controls?.target.set(0, 0, 0);
        controls?.update();
      },
      viewFront: () => {
        const controls = controlsRef.current;
        camera.position.copy(FRONT_CAM_POS);
        controls?.target.set(0, 0, 0);
        controls?.update();
      },
      viewTop: () => {
        const controls = controlsRef.current;
        camera.position.copy(TOP_CAM_POS);
        controls?.target.set(0, 0, 0);
        controls?.update();
      },
    };
  }, [camera, apiRef]);

  useFrame((_, delta) => {
    if (cubeRootRef.current && autoRotateIdle && !animFrameRef.current) {
      cubeRootRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[8, 10, 6]} intensity={1.2} color="#fff8ef" />
      <directionalLight position={[-6, -4, -8]} intensity={0.35} color="#cce0ff" />

      <group ref={cubeRootRef} rotation={autoRotateIdle ? [0.45, 0, 0] : [0.45, -0.55, 0]}>
        {cubies.map((c) => (
          <CubieMesh key={c.id} cubie={c} animFrameRef={animFrameRef} />
        ))}
      </group>

      {interactive && (
        <OrbitControls
          ref={controlsRef}
          enableZoom={false}
          enablePan={false}
          minDistance={MIN_DIST}
          maxDistance={MAX_DIST}
          minPolarAngle={0.05}
          maxPolarAngle={Math.PI - 0.05}
          dampingFactor={0.12}
          rotateSpeed={1.6}
          enableDamping={false}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.ROTATE }}
          mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.ROTATE }}
        />
      )}
    </>
  );
};

interface CubeRenderer3DProps {
  size?: number | string;
  interactive?: boolean;
  autoRotateIdle?: boolean;
  enableInputs?: boolean;
  gestureMode?: string;
}

const CubeRenderer3D = forwardRef<CubeRenderer3DHandle, CubeRenderer3DProps>(
  ({ size = 260, interactive = true, autoRotateIdle }, ref) => {
    const { cubies, animFrameRef } = useCubeContext();
    const { idleAutoRotate } = useCubeSettings();
    const apiRef = useRef<CameraApiRef | null>(null);

    const idle = autoRotateIdle ?? (!interactive && idleAutoRotate);

    useImperativeHandle(ref, () => ({
      zoomIn: () => apiRef.current?.zoomIn(),
      zoomOut: () => apiRef.current?.zoomOut(),
      resetView: () => apiRef.current?.resetView(),
      viewFront: () => apiRef.current?.viewFront(),
      viewTop: () => apiRef.current?.viewTop(),
    }), []);

    return (
      <div
        style={{ width: size, height: size }}
        className={
          interactive
            ? 'cursor-grab active:cursor-grabbing touch-none select-none'
            : 'pointer-events-none select-none'
        }
      >
        <Canvas
          camera={{ position: [8, 6.5, 8], fov: 40 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
          shadows={false}
        >
          <CubeSceneInner
            cubies={cubies}
            animFrameRef={animFrameRef}
            interactive={interactive}
            autoRotateIdle={idle}
            apiRef={apiRef}
          />
        </Canvas>
      </div>
    );
  },
);

CubeRenderer3D.displayName = 'CubeRenderer3D';

export default CubeRenderer3D;
