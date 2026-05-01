/**
 * CubeSettings — global, persisted user preferences for the 3D cube.
 *
 *   - animationSpeed: 'slow' | 'normal' | 'fast'  (drives AnimationController)
 *   - idleAutoRotate: boolean                     (Home / hero displays)
 *
 * Persisted in localStorage under "jsn_cube_settings".
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SpeedPreset } from './AnimationController';

export type AnimationSpeed = Extract<SpeedPreset, 'slow' | 'normal' | 'fast'>;

export interface CubeSettings {
  animationSpeed: AnimationSpeed;
  idleAutoRotate: boolean;
}

interface CubeSettingsContextValue extends CubeSettings {
  setAnimationSpeed: (s: AnimationSpeed) => void;
  setIdleAutoRotate: (v: boolean) => void;
}

const STORAGE_KEY = 'jsn_cube_settings';
const DEFAULTS: CubeSettings = {
  animationSpeed: 'normal',
  idleAutoRotate: true,
};

const Ctx = createContext<CubeSettingsContextValue | null>(null);

function load(): CubeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      animationSpeed: ['slow', 'normal', 'fast'].includes(parsed.animationSpeed)
        ? parsed.animationSpeed
        : DEFAULTS.animationSpeed,
      idleAutoRotate:
        typeof parsed.idleAutoRotate === 'boolean'
          ? parsed.idleAutoRotate
          : DEFAULTS.idleAutoRotate,
    };
  } catch {
    return DEFAULTS;
  }
}

export function CubeSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CubeSettings>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore quota errors */
    }
  }, [settings]);

  const value = useMemo<CubeSettingsContextValue>(
    () => ({
      ...settings,
      setAnimationSpeed: (animationSpeed) =>
        setSettings((s) => ({ ...s, animationSpeed })),
      setIdleAutoRotate: (idleAutoRotate) =>
        setSettings((s) => ({ ...s, idleAutoRotate })),
    }),
    [settings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCubeSettings(): CubeSettingsContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCubeSettings must be used within <CubeSettingsProvider>');
  return ctx;
}
