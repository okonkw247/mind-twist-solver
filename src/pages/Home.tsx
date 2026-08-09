import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera,
  Settings as SettingsIcon,
  Timer as TimerIcon,
  Box,
  Grid3X3,
  GraduationCap,
  Home as HomeIcon,
  BarChart3,
  User,
  ChevronRight,
} from 'lucide-react';

const stickerColors = [
  'var(--cube-white)',
  'var(--cube-red)',
  'var(--cube-blue)',
  'var(--cube-orange)',
  'var(--cube-yellow)',
  'var(--cube-green)',
];

const tiles = [
  {
    icon: Camera,
    label: 'Camera',
    hint: 'Scan faces',
    path: '/camera',
    accent: 'var(--cube-blue)',
  },
  {
    icon: Grid3X3,
    label: 'Manual',
    hint: 'Tap stickers',
    path: '/manual-input',
    accent: 'var(--cube-orange)',
  },
  {
    icon: TimerIcon,
    label: 'Timer',
    hint: 'WCA stopwatch',
    path: '/timer',
    accent: 'var(--cube-green)',
  },
  {
    icon: GraduationCap,
    label: 'Tutorials',
    hint: 'Learn to solve',
    path: '/tutorials',
    accent: 'var(--cube-yellow)',
  },
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
      <header className="px-5 pt-7 pb-5 flex items-center justify-between max-w-md w-full mx-auto">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center"
            style={{ boxShadow: '0 0 18px hsl(var(--primary) / 0.45)' }}
          >
            <Box className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <h1 className="text-[22px] font-bold tracking-tight">
              Cube <span className="text-primary">Mastery</span>
            </h1>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 tracking-wide uppercase">
              Solve · Practice · Improve
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="w-11 h-11 rounded-2xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
          aria-label="Settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 px-5 pb-4 flex flex-col gap-5 max-w-md w-full mx-auto">
        {/* Primary action — virtual cube */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/virtual-cube')}
          className="relative overflow-hidden rounded-[1.75rem] px-6 py-7 flex items-center gap-5 text-left text-primary-foreground border border-primary/30 active:scale-[0.97] transition-transform duration-200"
          style={{
            background:
              'linear-gradient(135deg, hsl(var(--primary)), hsl(187 92% 34%))',
            boxShadow: '0 18px 38px -16px hsl(var(--primary) / 0.4)',
          }}
        >
          <div className="absolute top-4 right-4 grid grid-cols-3 gap-1 opacity-20">
            {stickerColors.map((c) => (
              <span
                key={c}
                className="w-3 h-3 rounded-sm"
                style={{ background: `hsl(${c})` }}
              />
            ))}
          </div>
          <div className="w-16 h-16 rounded-2xl bg-background/15 border border-primary-foreground/25 flex items-center justify-center backdrop-blur-sm shrink-0">
            <Box className="w-8 h-8" strokeWidth={1.8} />
          </div>
          <div className="relative">
            <span className="block text-[21px] font-bold leading-tight">
              Virtual Cube
            </span>
            <p className="text-[13px] font-medium opacity-75 mt-0.5">
              Turn faces with your hand
            </p>
          </div>
        </motion.button>

        {/* Tool tiles */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-1 mb-3">
            Tools
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((tile, i) => (
              <motion.button
                key={tile.path}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * (i + 1) }}
                onClick={() => navigate(tile.path)}
                className="min-h-[116px] rounded-3xl bg-secondary/60 border border-border p-4 flex flex-col justify-between text-left hover:bg-secondary transition-colors active:scale-[0.96]"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center border"
                  style={{
                    background: `hsl(${tile.accent} / 0.18)`,
                    borderColor: `hsl(${tile.accent} / 0.3)`,
                    color: `hsl(${tile.accent})`,
                  }}
                >
                  <tile.icon className="w-[22px] h-[22px]" strokeWidth={2} />
                </div>
                <div>
                  <span className="block text-[15px] font-bold leading-tight">
                    {tile.label}
                  </span>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {tile.hint}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Stats row */}
        <button
          onClick={() => navigate('/collection')}
          className="rounded-3xl bg-card border border-border px-5 py-4 flex items-center justify-between hover:bg-secondary/60 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="text-[15px] font-semibold">Your progress</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </main>

      {/* Bottom nav pill */}
      <nav className="px-5 pb-7 pt-2 max-w-md w-full mx-auto safe-bottom">
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
                className={`w-14 h-12 flex items-center justify-center rounded-2xl transition-colors ${
                  active
                    ? 'bg-card text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-[22px] h-[22px]" />
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Home;
