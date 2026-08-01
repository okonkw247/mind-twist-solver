import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera,
  Settings as SettingsIcon,
  Timer as TimerIcon,
  Box,
  Grid3x3,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const primaryActions = [
  {
    label: 'Manual Input',
    description: 'Paint each face by hand',
    icon: Grid3x3,
    path: '/manual-input',
  },
  {
    label: 'Camera Input',
    description: 'Scan your cube in real time',
    icon: Camera,
    path: '/camera',
  },
];

const secondaryActions = [
  { label: 'Virtual Cube', description: 'Practice & scramble', icon: Box, path: '/virtual-cube' },
  { label: 'Cube Timer', description: 'WCA hand timer', icon: TimerIcon, path: '/timer' },
  { label: 'Settings', description: 'Speed & rotation', icon: SettingsIcon, path: '/settings' },
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="pt-12 pb-8 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Professional cube solver
        </div>
        <h1
          className="text-5xl font-extrabold tracking-tight text-primary"
          style={{ textShadow: '0 0 34px hsl(var(--primary) / 0.35)' }}
        >
          CubeX
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-sm mx-auto">
          Scan, solve and learn any 3x3 cube with step-by-step guidance.
        </p>
      </header>

      <main className="flex-1 px-4 max-w-xl mx-auto w-full pb-16">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Start a solve
        </p>

        <div className="space-y-3">
          {primaryActions.map((action, i) => (
            <motion.button
              key={action.path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(action.path)}
              className="w-full flex items-center gap-4 rounded-2xl border-2 border-primary/40 bg-card px-5 py-5 text-left hover:border-primary transition-colors active:scale-[0.99]"
              style={{ boxShadow: '0 0 26px hsl(var(--primary) / 0.10)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <action.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="block font-bold text-lg leading-tight">{action.label}</span>
                <span className="block text-sm text-muted-foreground">{action.description}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          ))}
        </div>

        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-8 mb-3">
          Tools
        </p>

        <div className="grid grid-cols-2 gap-3">
          {secondaryActions.map((action, i) => (
            <motion.button
              key={action.path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => navigate(action.path)}
              className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3 text-left hover:border-primary/50 transition-colors active:scale-[0.98]"
            >
              <action.icon className="w-8 h-8 text-primary" strokeWidth={1.9} />
              <div>
                <span className="block font-bold leading-tight">{action.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {action.description}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Home;
