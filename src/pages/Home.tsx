import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, Crown, Info, Camera, Edit3, Play, Timer, Trophy, X, Star } from 'lucide-react';
import RubiksCube3D from '@/components/RubiksCube3D';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const featureCards = [
  {
    id: 'play',
    icon: Play,
    label: 'Play Cube',
    description: 'Interactive practice',
    route: '/play-cube',
    color: 'from-purple to-magenta',
  },
  {
    id: 'solver',
    icon: Edit3,
    label: 'Visual Solver',
    description: 'Paint & solve with animations',
    route: '/solver',
    color: 'from-cyan to-blue',
  },
];

const quickActions = [
  {
    id: 'timer',
    icon: Timer,
    label: 'Timer',
    route: '/timer',
  },
  {
    id: 'compete',
    icon: Trophy,
    label: 'Compete',
    route: '/compete',
    pro: true,
  },
];

const menuItems = [
  { label: 'Home', route: '/home' },
  { label: 'Visual Solver', route: '/solver' },
  { label: 'Manual Input', route: '/manual-input' },
  { label: 'Camera Scan', route: '/camera' },
  { label: 'Play Cube', route: '/play-cube' },
  { label: 'Timer', route: '/timer' },
  { label: 'Settings', route: '/settings' },
  { label: 'Upgrade to PRO', route: '/premium', pro: true },
];

const Home = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-purple/20 via-background to-background pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              className="p-3 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-card border-border">
            <nav className="flex flex-col gap-2 mt-8">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    navigate(item.route);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
                >
                  <span className="flex-1">{item.label}</span>
                  {item.pro && <Crown className="w-4 h-4 text-yellow-400" />}
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <h1 className="text-xl font-bold">Rubik Solver</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRatingModal(true)}
            className="p-3 rounded-full bg-cyan/20 hover:bg-cyan/30 transition-colors"
            aria-label="Info"
          >
            <Info className="w-5 h-5 text-cyan" />
          </button>
          <button
            onClick={() => navigate('/premium')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan to-green-400 text-background font-bold text-sm"
          >
            <Crown className="w-4 h-4" />
            PRO
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 pb-8">
        {/* Hero Section with 3D Cube */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl bg-gradient-to-br from-purple/40 to-magenta/20 p-6 mb-6 overflow-hidden"
        >
          {/* Scan Frame Corners */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className="relative w-32 h-32">
              <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-white/50" />
              <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-white/50" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-white/50" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-white/50" />
            </div>
          </div>

          <div className="flex justify-center pt-4 pb-8">
            <Suspense fallback={
              <div className="w-36 h-36 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            }>
              <RubiksCube3D size={180} autoRotate={true} />
            </Suspense>
          </div>

          {/* Scan & Solve CTA */}
          <button
            onClick={() => navigate('/camera')}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <div className="text-left">
              <h2 className="text-xl font-bold">Scan & Solve Cube</h2>
              <p className="text-sm text-white/70">scan Your Cube and Get the Solution</p>
            </div>
            <div className="flex gap-1">
              <Camera className="w-6 h-6 opacity-100" />
              <Camera className="w-6 h-6 opacity-60" />
              <Camera className="w-6 h-6 opacity-30" />
            </div>
          </button>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {featureCards.map((card, index) => (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              onClick={() => navigate(card.route)}
              className={`p-5 rounded-2xl bg-gradient-to-br ${card.color} opacity-80 hover:opacity-100 transition-all hover:scale-105`}
            >
              <card.icon className="w-12 h-12 mb-4 text-white/90" />
              <h3 className="text-lg font-bold text-left">{card.label}</h3>
              <p className="text-xs text-white/70 text-left">{card.description}</p>
            </motion.button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate('/manual-input')}
            className="p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all hover:scale-105"
          >
            <div className="w-12 h-12 mx-auto mb-2">
              {/* 3x3 mini grid icon */}
              <div className="grid grid-cols-3 gap-0.5 w-full h-full">
                {Array(9).fill(0).map((_, i) => (
                  <div key={i} className={`rounded-sm ${i % 2 === 0 ? 'bg-cube-red' : 'bg-cube-green'}`} />
                ))}
              </div>
            </div>
            <span className="text-sm font-medium">3x3 Time</span>
          </motion.button>

          {quickActions.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + index * 0.05 }}
              onClick={() => navigate(action.route)}
              className="p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all hover:scale-105 relative"
            >
              {action.pro && (
                <Crown className="absolute top-2 right-2 w-4 h-4 text-yellow-400" />
              )}
              <action.icon className="w-10 h-10 mx-auto mb-2 text-cyan" />
              <span className="text-sm font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Cube Size Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Select Cube Size</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[2, 3, 4, 5, 6, 7, 8].map((size) => {
              const isPro = size > 3;
              return (
                <button
                  key={size}
                  onClick={() => !isPro && navigate('/manual-input', { state: { cubeSize: size } })}
                  className={`flex-shrink-0 px-6 py-3 rounded-full font-bold transition-all ${
                    size === 3
                      ? 'bg-primary text-primary-foreground'
                      : isPro
                      ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {size}×{size}
                  {isPro && <Crown className="inline-block w-3 h-3 ml-1 text-yellow-400" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      </main>

      {/* Rating Modal */}
      {showRatingModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
          onClick={() => setShowRatingModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-card rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowRatingModal(false)}
              className="absolute top-4 left-4 p-2"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Do you like</h2>
              <h2 className="text-2xl font-bold mb-4">Rubik Cube Solver?</h2>
              <p className="text-muted-foreground text-sm mb-2">
                We are working hard for a better user experience.
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                We'd greatly appreciate if you can rate us
              </p>

              {/* Stars */}
              <div className="flex justify-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                The best we can get <span className="inline-block ml-1 rotate-[-30deg]">↗</span>
              </p>

              <button
                onClick={() => setShowRatingModal(false)}
                className="w-full py-4 rounded-xl bg-secondary text-foreground font-bold"
              >
                Rate
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Home;
