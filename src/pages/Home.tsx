import { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Camera, Puzzle, Timer as TimerIcon } from 'lucide-react';
import CubeRenderer3D from '@/components/CubeRenderer3D';
import BottomNav from '@/components/BottomNav';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center justify-between px-4 py-4 safe-top max-w-xl mx-auto">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">JSN Solver</h1>
          <p className="text-xs text-muted-foreground">Real-time Rubik's cube workspace</p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="btn-icon"
          aria-label="Settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      <main className="px-4 max-w-xl mx-auto">
        {/* 3D Cube hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-6 mb-6"
        >
          <div className="flex justify-center py-2">
            <Suspense
              fallback={
                <div className="w-56 h-56 flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-muted border-t-primary rounded-full animate-spin" />
                </div>
              }
            >
              <CubeRenderer3D size={240} interactive={false} />
            </Suspense>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Honors your speed &amp; idle-rotate preferences
          </p>
        </motion.section>

        {/* Quick actions */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-3"
        >
          <button
            onClick={() => navigate('/camera')}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-secondary transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Scan a cube</p>
              <p className="text-xs text-muted-foreground">Use your camera to capture all six faces</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/solver')}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-secondary transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Puzzle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Open solver</p>
              <p className="text-xs text-muted-foreground">Shuffle, hint, and step through solutions</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/timer')}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-secondary transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <TimerIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">WCA timer</p>
              <p className="text-xs text-muted-foreground">15s inspection, +2 / DNF penalties</p>
            </div>
          </button>
        </motion.section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
