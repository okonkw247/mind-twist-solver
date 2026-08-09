import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera,
  Settings as SettingsIcon,
  Timer as TimerIcon,
  Box,
  ClipboardCheck,
  Home as HomeIcon,
  BarChart3,
  User,
} from 'lucide-react';

const stickerColors = [
  'var(--cube-white)',
  'var(--cube-red)',
  'var(--cube-blue)',
  'var(--cube-orange)',
  'var(--cube-yellow)',
  'var(--cube-green)',
];

const Home = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "'Space Grotesk', Inter, system-ui, sans-serif" }}
    >
      {/* App header */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between max-w-md w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"
            style={{ boxShadow: '0 0 16px hsl(var(--primary) / 0.45)' }}
          >
            <Box className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cube<span className="text-primary">X</span>
          </h1>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="p-2.5 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 px-6 pb-4 flex flex-col gap-5 max-w-md w-full mx-auto">
        {/* Primary action — camera */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/camera')}
          className="relative overflow-hidden rounded-[2rem] px-8 py-10 flex flex-col items-center justify-center gap-4 text-primary-foreground border border-primary/30 active:scale-[0.96] transition-transform duration-200"
          style={{
            background:
              'linear-gradient(135deg, hsl(var(--primary)), hsl(187 92% 34%))',
            boxShadow: '0 20px 40px -15px hsl(var(--primary) / 0.35)',
          }}
        >
          <div className="absolute top-4 right-4 grid grid-cols-3 gap-1 opacity-25">
            {stickerColors.map((c) => (
              <span
                key={c}
                className="w-3 h-3 rounded-sm"
                style={{ background: `hsl(${c})` }}
              />
            ))}
          </div>
          <div className="w-20 h-20 rounded-full bg-background/15 border border-primary-foreground/25 flex items-center justify-center backdrop-blur-sm">
            <Camera className="w-10 h-10" strokeWidth={1.8} />
          </div>
          <div className="text-center">
            <span className="block text-2xl font-bold">Camera Input</span>
            <p className="text-sm font-medium opacity-70">Scan cube faces instantly</p>
          </div>
        </motion.button>

        {/* Secondary action — manual */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => navigate('/manual-input')}
          className="w-full rounded-[2rem] bg-secondary/60 border border-border p-5 flex items-center gap-5 text-left hover:bg-secondary transition-colors active:scale-[0.98]"
        >
          <div className="w-14 h-14 rounded-2xl bg-card border border-border text-primary flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-7 h-7" strokeWidth={1.9} />
          </div>
          <div>
            <span className="block text-lg font-bold">Manual Entry</span>
            <p className="text-sm text-muted-foreground">Tap to input stickers manually</p>
          </div>
        </motion.button>

        {/* Tool grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('/virtual-cube')}
            className="rounded-[2rem] bg-secondary/60 border border-border p-5 flex flex-col gap-3 text-left hover:bg-secondary transition-colors active:scale-[0.96]"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                background: 'hsl(var(--cube-blue) / 0.2)',
                borderColor: 'hsl(var(--cube-blue) / 0.3)',
                color: 'hsl(var(--cube-blue))',
              }}
            >
              <Box className="w-6 h-6" strokeWidth={2} />
            </div>
            <div>
              <span className="block font-bold">Virtual Cube</span>
              <p className="text-xs text-muted-foreground">Practice without hardware</p>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate('/timer')}
            className="rounded-[2rem] bg-secondary/60 border border-border p-5 flex flex-col gap-3 text-left hover:bg-secondary transition-colors active:scale-[0.96]"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                background: 'hsl(var(--cube-green) / 0.2)',
                borderColor: 'hsl(var(--cube-green) / 0.3)',
                color: 'hsl(var(--cube-green))',
              }}
            >
              <TimerIcon className="w-6 h-6" strokeWidth={2} />
            </div>
            <div>
              <span className="block font-bold">Cube Timer</span>
              <p className="text-xs text-muted-foreground">WCA hand stopwatch</p>
            </div>
          </motion.button>
        </div>
      </main>

      {/* Bottom nav pill */}
      <nav className="px-6 pb-8 pt-2 max-w-md w-full mx-auto safe-bottom">
        <div className="rounded-3xl bg-secondary/60 border border-border backdrop-blur-xl p-2 flex justify-around items-center">
          {[
            { icon: HomeIcon, path: '/home', label: 'Home' },
            { icon: BarChart3, path: '/collection', label: 'Stats' },
            { icon: User, path: '/profile', label: 'Profile' },
          ].map((item) => {
            const active = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                aria-label={item.label}
                className={`p-3 rounded-2xl transition-colors ${
                  active
                    ? 'bg-card text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-6 h-6" />
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Home;
