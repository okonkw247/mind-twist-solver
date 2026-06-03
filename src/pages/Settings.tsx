import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Gauge, RefreshCw, Info } from 'lucide-react';
import { useCubeSettings, type AnimationSpeed } from '@/cube/CubeSettings';
import { cn } from '@/lib/utils';

const Settings = () => {
  const navigate = useNavigate();
  const { animationSpeed, setAnimationSpeed, idleAutoRotate, setIdleAutoRotate } =
    useCubeSettings();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 px-4 py-4 safe-top">
        <button onClick={() => navigate(-1)} className="btn-icon" aria-label="Back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-wide flex-1 text-center pr-10">Settings</h1>
      </header>

      <main className="px-4 max-w-xl mx-auto pb-12">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-5 mb-4"
        >
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            Cube animation
          </h2>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Gauge className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Animation speed</p>
              <p className="text-xs text-muted-foreground">Applies to every cube screen</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {(['slow', 'normal', 'fast'] as AnimationSpeed[]).map((s) => (
              <button
                key={s}
                onClick={() => setAnimationSpeed(s)}
                className={cn(
                  'py-2 rounded-lg text-sm font-semibold capitalize border border-border transition-colors',
                  animationSpeed === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary hover:bg-muted',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-6">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Idle auto-rotate</p>
              <p className="text-xs text-muted-foreground">Spin the cube slowly when idle</p>
            </div>
            <Toggle enabled={idleAutoRotate} onChange={setIdleAutoRotate} />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-card border border-border p-5 mb-4"
        >
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            About
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">CubeX</p>
              <p className="text-xs text-muted-foreground">v1.0 — Rubik&apos;s cube solver</p>
            </div>
          </div>
        </motion.section>

        <button
          onClick={() => navigate('/home')}
          className="w-full py-4 rounded-xl bg-secondary hover:bg-muted font-semibold"
        >
          Back to home
        </button>
      </main>
    </div>
  );
};

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
    aria-pressed={enabled}
  >
    <motion.div
      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md"
      animate={{ x: enabled ? 20 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
);

export default Settings;
