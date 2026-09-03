import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera,
  Settings as SettingsIcon,
  Timer as TimerIcon,
  Box,
  Grid3x3,
  Puzzle,
} from 'lucide-react';

const tiles = [
  { label: 'Manual Input', icon: Grid3x3, path: '/manual-input' },
  { label: 'Camera Input', icon: Camera, path: '/camera' },
  { label: 'Pattern Solver', icon: Puzzle, path: '/solution' },
  { label: 'Virtual Cube', icon: Box, path: '/virtual-cube' },
  { label: 'Cube Timer', icon: TimerIcon, path: '/timer' },
  { label: 'Settings', icon: SettingsIcon, path: '/settings' },
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="pt-10 pb-6 text-center">
        <h1
          className="text-7xl tracking-tight"
          style={{
            color: '#FFD500',
            textShadow: '0 4px 0 #000, 0 0 18px rgba(255, 213, 0, 0.45)',
            WebkitTextStroke: '3px #000',
            fontFamily: "'Luckiest Guy', cursive",
          }}
        >
          JSN Cubing
        </h1>
      </header>

      <main className="flex-1 px-4 max-w-xl mx-auto w-full pb-12">
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Box className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">Solve</span>
          </div>

          <div className="grid grid-cols-2">
            {tiles.slice(0, 2).map((t, i) => (
              <Tile key={t.path} {...t} onClick={() => navigate(t.path)} index={i} divideRight={i === 0} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          {tiles.slice(2).map((t, i) => (
            <motion.button
              key={t.path}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + 2) * 0.04 }}
              onClick={() => navigate(t.path)}
              className="aspect-square rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-3 hover:bg-secondary/40 active:scale-[0.98] transition-all"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: (i + 2) * 0.15 }}
              >
                <t.icon className="w-12 h-12" strokeWidth={1.8} />
              </motion.div>
              <span className="font-bold text-lg">{t.label}</span>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
};

const Tile = ({
  label,
  icon: Icon,
  onClick,
  index,
  divideRight,
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  index: number;
  divideRight?: boolean;
}) => (
  <motion.button
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    onClick={onClick}
    className={`py-10 flex flex-col items-center justify-center gap-3 hover:bg-secondary/40 active:scale-[0.98] transition-all ${
      divideRight ? 'border-r border-border' : ''
    }`}
  >
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.15 }}
    >
      <Icon className="w-12 h-12" strokeWidth={1.8} />
    </motion.div>
    <span className="font-bold text-lg">{label}</span>
  </motion.button>
);

export default Home;
