/**
 * CubeRenderer3D — Reads from CubeProvider context and renders 3D cube.
 *
 * SaaS-grade visuals:
 *   - Pure black matte plastic body with subtle bevel highlight
 *   - Official WCA palette, slightly enriched roughness map look
 *   - Two-light setup, no shadows
 *
 * Real-time input (when interactive):
 *   - Swipe up/down/left/right on the cube surface → R / R' / U / U'
 *   - Keyboard: R U L D F B (shift = prime, "2" = double) — Solver-style speedcube map
 *   - Optional on-screen ControlPad rendered separately (`CubeControlPad`)
 *
 * Idle behaviour:
 *   - Honours global CubeSettings.idleAutoRotate unless `autoRotateIdle` is
 *     explicitly passed.
 */

import { useRef, useMemo, memo, forwardRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useCubeContext } from '@/cube/CubeProvider';
import { useCubeSettings } from '@/cube/CubeSettings';
import type { Cubie, ColorName, Vec3 } from '@/cube/CubeModel';
import type { AnimationFrame } from '@/cube/AnimationController';

// ── Shared geometries & materials ────────────────────────────────────────────

const PLANE_GEO = new THREE.PlaneGeometry(0.82, 0.82);

const BODY_MAT = new THREE.MeshStandardMaterial({
  color: '#0a0a0a',
  roughness: 0.78,
  metalness: 0.08,
});

// WCA palette, slightly richer specular response for a "real cube" feel.
const FACELET_MATS: Record<ColorName, THREE.MeshStandardMaterial> = {
  white:  new THREE.MeshStandardMaterial({ color: '#F8F8F8', roughness: 0.38, metalness: 0.02 }),
  yellow: new THREE.MeshStandardMaterial({ color: '#FFD500', roughness: 0.38, metalness: 0.02 }),
  red:    new THREE.MeshStandardMaterial({ color: '#C41E3A', roughness: 0.40, metalness: 0.02 }),
  orange: new THREE.MeshStandardMaterial({ color: '#FF5800', roughness: 0.40, metalness: 0.02 }),
  blue:   new THREE.MeshStandardMaterial({ color: '#0051BA', roughness: 0.40, metalness: 0.02 }),
  green:  new THREE.MeshStandardMaterial({ color: '#009E60', roughness: 0.40, metalness: 0.02 }),
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
  '0,0,1':  [0, 0, 0],
  '0,0,-1': [0, Math.PI, 0],
  '0,1,0':  [-Math.PI / 2, 0, 0],
  '0,-1,0': [Math.PI / 2, 0, 0],
  '1,0,0':  [0, Math.PI / 2, 0],
  '-1,0,0': [0, -Math.PI / 2, 0],
};

// ── Cubie mesh ───────────────────────────────────────────────────────────────

const CubieMesh = memo(({ cubie }: { cubie: Cubie }) => {
  const offset = 0.502;
  const q = useMemo(() => mat3ToQuaternion(cubie.orientation), [cubie.orientation]);

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

type GestureMode = 'hybrid' | 'turn-primary';

interface SceneProps {
  cubies: readonly Cubie[];
  animFrame: AnimationFrame | null;
  interactive: boolean;
  autoRotateIdle: boolean;
  gestureMode: GestureMode;
}

const CubeSceneInner = ({ cubies, animFrame, interactive, autoRotateIdle, gestureMode }: SceneProps) => {
  const cubeRootRef = useRef<THREE.Group>(null);
  const rotatingGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (cubeRootRef.current && autoRotateIdle && !animFrame) {
      cubeRootRef.current.rotation.y += delta * 0.35;
    }
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
  }, [cubies, animFrame]);

  // In turn-primary mode, single-finger / left-mouse is reserved for face
  // turns (handled at the DOM level). OrbitControls gets two-finger rotate
  // and right-mouse rotate so the user can still orbit the camera.
  const touches = gestureMode === 'turn-primary'
    ? { ONE: undefined as unknown as THREE.TOUCH, TWO: THREE.TOUCH.ROTATE }
    : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const mouseButtons = gestureMode === 'turn-primary'
    ? { LEFT: undefined as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
    : undefined;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 10, 6]} intensity={1.0} color="#fff5e6" />
      <directionalLight position={[-6, -4, -8]} intensity={0.4} color="#cce0ff" />

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
          touches={touches}
          mouseButtons={mouseButtons}
        />
      )}
    </>
  );
};

// ── Public component ─────────────────────────────────────────────────────────

interface CubeRenderer3DProps {
  size?: number | string;
  /** Allow user to orbit/zoom the camera. Default: true. */
  interactive?: boolean;
  /** Override global CubeSettings.idleAutoRotate. */
  autoRotateIdle?: boolean;
  /** Enable swipe gestures and keyboard input to drive face turns. Default = interactive. */
  enableInputs?: boolean;
  /**
   * 'hybrid'        — 1-finger/left-drag orbits camera, swipe fires face turn (default).
   * 'turn-primary'  — 1-finger/left-drag = face turn, 2-finger/right-drag = orbit camera.
   */
  gestureMode?: GestureMode;
}

const CubeRenderer3D = forwardRef<HTMLDivElement, CubeRenderer3DProps>(
  ({ size = 260, interactive = true, autoRotateIdle, enableInputs, gestureMode = 'hybrid' }, ref) => {
    const { cubies, animFrame, enqueue } = useCubeContext();
    const { idleAutoRotate } = useCubeSettings();

    const inputsOn = enableInputs ?? interactive;
    const idle = autoRotateIdle ?? (!interactive && idleAutoRotate);

    // ── Keyboard input (R U L D F B  + shift for prime, "2" toggle) ────────
    useEffect(() => {
      if (!inputsOn) return;
      const handler = (e: KeyboardEvent) => {
        if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
        const key = e.key.toUpperCase();
        if (!'RULDFB'.includes(key)) return;
        const move = e.shiftKey ? `${key}'` : key;
        enqueue(move);
        e.preventDefault();
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [inputsOn, enqueue]);

    // ── Touch / pointer swipe → face turn ───────────────────────────────────
    const swipeStart = useRef<{ x: number; y: number } | null>(null);
    const onPointerDown = useCallback((e: React.PointerEvent) => {
      // Ignore right-clicks / secondary buttons
      if (e.button !== 0) return;
      swipeStart.current = { x: e.clientX, y: e.clientY };
    }, []);
    const onPointerUp = useCallback(
      (e: React.PointerEvent) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (!start || !inputsOn) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        const THRESHOLD = 32;
        if (Math.max(ax, ay) < THRESHOLD) return; // treat as tap, let OrbitControls handle
        // Map cardinal swipe to face turns:
        //   right   → U
        //   left    → U'
        //   up      → R
        //   down    → R'
        let move: string;
        if (ax > ay) move = dx > 0 ? 'U' : "U'";
        else move = dy < 0 ? 'R' : "R'";
        enqueue(move);
      },
      [inputsOn, enqueue],
    );

    return (
      <div
        ref={ref}
        style={{ width: size, height: size }}
        onPointerDown={inputsOn ? onPointerDown : undefined}
        onPointerUp={inputsOn ? onPointerUp : undefined}
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
            autoRotateIdle={idle}
            gestureMode={gestureMode}
          />
        </Canvas>
      </div>
    );
  },
);

CubeRenderer3D.displayName = 'CubeRenderer3D';

export default CubeRenderer3D;
