/**
 * CubeRenderer3D — Reads from CubeProvider context and renders 3D cube.
 *
 * Gesture model:
 *  - One-finger drag: orbits the camera around the cube (view only,
 *    cube itself never turns from this).
 *  - Pinch/scroll zoom is DISABLED — zoom is controlled only via the
 *    imperative API below (zoomIn/zoomOut/resetView/viewFront), wired
 *    to the CameraControls buttons on the page.
 */

import { useRef, useMemo, memo, forwardRef, useEffect, useImperativeHandle, useCallback } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useCubeContext } from '@/cube/CubeProvider';
import { useCubeSettings } from '@/cube/CubeSettings';
import type { Cubie, ColorName, Vec3, Mat3 } from '@/cube/CubeModel';
import type { AnimationFrame } from '@/cube/AnimationController';

const PLANE_GEO = new THREE.PlaneGeometry(0.50, 0.50);

const BODY_MAT = new THREE.MeshStandardMaterial({
  color: '#050505',
  roughness: 0.25,
  metalness: 0.05,
});

const FACELET_MATS: Record<ColorName, THREE.MeshPhysicalMaterial> = {
  white:  new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', clearcoat: 1.0, clearcoatRoughness: 0.05, roughness: 0.12, metalness: 0.0 }),
  yellow: new THREE.MeshPhysicalMaterial({ color: '#FFE600', clearcoat: 1.0, clearcoatRoughness: 0.05, roughness: 0.12, metalness: 0.0 }),
  red:    new THREE.MeshPhysicalMaterial({ color: '#FF1A1A', clearcoat: 1.0, clearcoatRoughness: 0.05, roughness: 0.12, metalness: 0.0 }),
  orange: new THREE.MeshPhysicalMaterial({ color: '#FF8C00', clearcoat: 1.0, clearcoatRoughness: 0.05, roughness: 0.12, metalness: 0.0 }),
  blue:   new THREE.MeshPhysicalMaterial({ color: '#0066FF', clearcoat: 1.0, clearcoatRoughness: 0.05, roughness: 0.12, metalness: 0.0 }),
  green:  new THREE.MeshPhysicalMaterial({ color: '#00E676', clearcoat: 1.0, clearcoatRoughness: 0.05, roughness: 0.12, metalness: 0.0 }),
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

function transformVec3(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
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
const AXIS_NAMES: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];

const AXIS_LAYER_TO_FACE: Record<string, string> = {
  '0,1': 'R', '0,-1': 'L',
  '1,1': 'U', '1,-1': 'D',
  '2,1': 'F', '2,-1': 'B',
};
const FACE_CW_SIGN: Record<string, number> = { R: -1, U: -1, F: -1, L: 1, D: 1, B: 1 };

const DRAG_LOCK_THRESHOLD = 10; // px before we commit to an axis
const DRAG_SENSITIVITY = 70;   // px per radian
const MAX_DRAG_ANGLE = Math.PI; // clamp — one gesture maxes at a half turn

interface LiveFrame {
  axis: 'x' | 'y' | 'z';
  layerValue: number;
  currentAngle: number;
}

interface DragState {
  candidateAxes: [number, number];
  layerValues: [number, number];
  screenDirs: [{ x: number; y: number }, { x: number; y: number }];
  startX: number;
  startY: number;
  locked: boolean;
  lockedAxis: 'x' | 'y' | 'z' | null;
  lockedLayerValue: number;
}

function isInAnimLayer(pos: Vec3, axis: string, layerValue: number): boolean {
  return Math.round(pos[FACE_LAYER_INDEX[axis]]) === layerValue;
}

interface CubieMeshProps {
  cubie: Cubie;
  animFrameRef: React.RefObject<AnimationFrame | null>;
  dragFrameRef: React.RefObject<LiveFrame | null>;
  onFaceletPointerDown: (e: ThreeEvent<PointerEvent>, cubie: Cubie, dirKey: string) => void;
}

const CubieMesh = memo(({ cubie, animFrameRef, dragFrameRef, onFaceletPointerDown }: CubieMeshProps) => {
  const offset = 0.502;
  const groupRef = useRef<THREE.Group>(null);

  const facelets = useMemo(() => {
    const result: JSX.Element[] = [];
    cubie.localColors.forEach((color, dirKey) => {
      const [lx, ly, lz] = dirKey.split(',').map(Number);
      const pos: [number, number, number] = [lx * offset, ly * offset, lz * offset];
      const rotation = FACELET_ROTATIONS[dirKey] || [0, 0, 0];
      result.push(
        <mesh
          key={dirKey}
          position={pos}
          rotation={rotation}
          geometry={PLANE_GEO}
          material={FACELET_MATS[color]}
          onPointerDown={(e) => onFaceletPointerDown(e, cubie, dirKey)}
        />,
      );
    });
    return result;
  }, [cubie.localColors, cubie, onFaceletPointerDown]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;

    const frame = dragFrameRef.current ?? animFrameRef.current;
    const basePos = new THREE.Vector3(cubie.position[0], cubie.position[1], cubie.position[2]);
    const baseQuat = mat3ToQuaternion(cubie.orientation);

    if (frame && isInAnimLayer(cubie.position, frame.axis, frame.layerValue)) {
      const axisVec = FACE_AXIS_MAP[frame.axis];
      const turnQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, frame.currentAngle);
      g.position.copy(basePos.applyQuaternion(turnQuat));
      g.quaternion.copy(turnQuat).multiply(baseQuat);
    } else {
      g.position.copy(basePos);
      g.quaternion.copy(baseQuat);
    }
  });

  return (
    <group ref={groupRef}>
      <RoundedBox args={[0.82, 0.82, 0.82]} radius={0.18} smoothness={8} material={BODY_MAT} />
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
  inputsOn: boolean;
  apiRef: React.MutableRefObject<CameraApiRef | null>;
}

function projectAxisScreenDir(
  p0: THREE.Vector3,
  dirWorld: THREE.Vector3,
  camera: THREE.Camera,
  rect: DOMRect,
): { x: number; y: number } {
  const p1 = p0.clone().addScaledVector(dirWorld, 0.4);
  const toScreen = (p: THREE.Vector3) => {
    const v = p.clone().project(camera);
    return {
      x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (1 - (v.y * 0.5 + 0.5)) * rect.height,
    };
  };
  const s0 = toScreen(p0);
  const s1 = toScreen(p1);
  return { x: s1.x - s0.x, y: s1.y - s0.y };
}

const CubeSceneInner = ({ cubies, animFrameRef, interactive, autoRotateIdle, inputsOn, apiRef }: SceneProps) => {
  const cubeRootRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const { camera, gl } = useThree();

  const { isAnimating, model, bumpVersion } = useCubeContext();

  const dragRef = useRef<DragState | null>(null);
  const dragFrameRef = useRef<LiveFrame | null>(null);
  const settleRafRef = useRef<number | null>(null);

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
    if (cubeRootRef.current && autoRotateIdle && !animFrameRef.current && !dragFrameRef.current) {
      cubeRootRef.current.rotation.y += delta * 0.35;
    }
  });

  const onFaceletPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, cubie: Cubie, dirKey: string) => {
      if (!inputsOn || isAnimating || dragRef.current) return;
      if (e.button !== 0) return;
      e.stopPropagation();
      (e as any).nativeEvent?.stopImmediatePropagation?.();

      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }

      const [lx, ly, lz] = dirKey.split(',').map(Number) as Vec3;
      const worldNormal = transformVec3(cubie.orientation, [lx, ly, lz]).map((v) => Math.round(v));
      const axisOfNormal = worldNormal.findIndex((v) => v !== 0);
      const candidateAxes = [0, 1, 2].filter((a) => a !== axisOfNormal) as [number, number];

      const rect = gl.domElement.getBoundingClientRect();
      const screenDirs = candidateAxes.map((axis) => {
        const localDir: Vec3 = [0, 0, 0];
        localDir[axis] = 1;
        const worldDir = transformVec3(cubie.orientation, localDir);
        const wDir = new THREE.Vector3(worldDir[0], worldDir[1], worldDir[2]);
        const p0 = new THREE.Vector3(cubie.position[0], cubie.position[1], cubie.position[2]);
        const p1 = p0.clone().addScaledVector(wDir, 0.5);
        const toScreen = (p: THREE.Vector3) => {
          const v = p.clone().project(camera);
          return {
            x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
            y: rect.top + (1 - (v.y * 0.5 + 0.5)) * rect.height,
          };
        };
        const s0 = toScreen(p0);
        const s1 = toScreen(p1);
        return { x: s1.x - s0.x, y: s1.y - s0.y };
      }) as [{ x: number; y: number }, { x: number; y: number }];

      dragRef.current = {
        candidateAxes,
        layerValues: [
          Math.round(cubie.position[candidateAxes[0]]),
          Math.round(cubie.position[candidateAxes[1]]),
        ],
        screenDirs,
        startX: e.clientX,
        startY: e.clientY,
        locked: false,
        lockedAxis: null,
        lockedLayerValue: 0,
      };
    },
    [inputsOn, isAnimating, camera, gl],
  );

  useEffect(() => {
    const settle = (
      from: number,
      targetTurns: number,
      axis: 'x' | 'y' | 'z',
      layerValue: number,
      notation: string | null,
    ) => {
      const target = targetTurns * (Math.PI / 2);
      const start = performance.now();
      const duration = 120;
      const startAngle = from;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) * (1 - t);
        dragFrameRef.current = { axis, layerValue, currentAngle: startAngle + (target - startAngle) * eased };
        if (t < 1) {
          settleRafRef.current = requestAnimationFrame(step);
        } else {
          dragFrameRef.current = null;
          if (notation) {
            model.applyMove(notation);
            bumpVersion();
          }
        }
      };
      settleRafRef.current = requestAnimationFrame(step);
    };

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      if (!drag.locked) {
        if (Math.hypot(dx, dy) < DRAG_LOCK_THRESHOLD) return;
        const dirs = drag.screenDirs;
        const dot0 = dirs[0].x * dx + dirs[0].y * dy;
        const dot1 = dirs[1].x * dx + dirs[1].y * dy;
        const mag0 = Math.hypot(dirs[0].x, dirs[0].y) || 1;
        const mag1 = Math.hypot(dirs[1].x, dirs[1].y) || 1;
        const pickIdx = Math.abs(dot0) / mag0 >= Math.abs(dot1) / mag1 ? 0 : 1;
        drag.locked = true;
        drag.lockedAxis = AXIS_NAMES[drag.candidateAxes[pickIdx]];
        drag.lockedLayerValue = drag.layerValues[pickIdx];
      }

      if (drag.locked && drag.lockedAxis) {
        const dirs = drag.screenDirs;
        const pickIdx = drag.candidateAxes.indexOf(AXIS_NAMES.indexOf(drag.lockedAxis));
        const dir = dirs[pickIdx];
        const mag = Math.hypot(dir.x, dir.y) || 1;
        const proj = (dir.x * dx + dir.y * dy) / mag;
        const angle = Math.max(-MAX_DRAG_ANGLE, Math.min(MAX_DRAG_ANGLE, -proj / DRAG_SENSITIVITY));
        dragFrameRef.current = { axis: drag.lockedAxis, layerValue: drag.lockedLayerValue, currentAngle: angle };
      }
    };

    const onUp = () => {
      const drag = dragRef.current;
      dragRef.current = null;

      // Re-enable OrbitControls upon drag completion
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }

      if (!drag || !drag.locked || !drag.lockedAxis) {
        dragFrameRef.current = null;
        return;
      }
      const current = dragFrameRef.current?.currentAngle ?? 0;
      let turns = Math.round(current / (Math.PI / 2));
      turns = ((turns % 4) + 4) % 4;
      if (turns === 3) turns = -1;

      const axisIndex = AXIS_NAMES.indexOf(drag.lockedAxis);
      const face = AXIS_LAYER_TO_FACE[`${axisIndex},${drag.lockedLayerValue}`];

      if (turns === 0 || !face) {
        settle(current, 0, drag.lockedAxis, drag.lockedLayerValue, null);
        return;
      }
      const cwSign = FACE_CW_SIGN[face];
      let notation: string;
      if (Math.abs(turns) === 2) notation = `${face}2`;
      else notation = turns === cwSign ? face : `${face}'`;

      settle(current, turns, drag.lockedAxis, drag.lockedLayerValue, notation);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (settleRafRef.current !== null) cancelAnimationFrame(settleRafRef.current);
    };
  }, [model, bumpVersion]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 12, 8]} intensity={1.6} color="#fff5e6" />
      <directionalLight position={[-8, -4, -10]} intensity={0.45} color="#d0e0ff" />
      <pointLight position={[-6, 8, -6]} intensity={0.6} color="#ffffff" distance={30} />
      <pointLight position={[6, -6, 6]} intensity={0.3} color="#ffe0b0" distance={30} />

      <group ref={cubeRootRef} rotation={autoRotateIdle ? [0.45, 0, 0] : [0.45, -0.55, 0]}>
        {cubies.map((c) => (
          <CubieMesh
            key={c.id}
            cubie={c}
            animFrameRef={animFrameRef}
            dragFrameRef={dragFrameRef}
            onFaceletPointerDown={onFaceletPointerDown}
          />
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
  ({ size = 260, interactive = true, autoRotateIdle, enableInputs }, ref) => {
    const { cubies, animFrameRef, enqueue } = useCubeContext();
    const { idleAutoRotate } = useCubeSettings();
    const apiRef = useRef<CameraApiRef | null>(null);

    const inputsOn = enableInputs ?? interactive;
    const idle = autoRotateIdle ?? (!interactive && idleAutoRotate);

    useImperativeHandle(ref, () => ({
      zoomIn: () => apiRef.current?.zoomIn(),
      zoomOut: () => apiRef.current?.zoomOut(),
      resetView: () => apiRef.current?.resetView(),
      viewFront: () => apiRef.current?.viewFront(),
      viewTop: () => apiRef.current?.viewTop(),
    }), []);

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
            inputsOn={inputsOn}
            apiRef={apiRef}
          />
        </Canvas>
      </div>
    );
  },
);

CubeRenderer3D.displayName = 'CubeRenderer3D';

export default CubeRenderer3D;
