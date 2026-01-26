import { useState } from 'react';
import { Menu, X, Home, Puzzle, Clock, BookOpen, Crown, Settings, Info, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

const menuItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Puzzle, label: 'Cube Solver', path: '/manual-input' },
  { icon: Clock, label: 'Timer', path: '/timer' },
  { icon: BookOpen, label: 'Tutorials', path: '/tutorials', premium: true },
  { icon: Crown, label: 'Upgrade to Premium', path: '/premium', highlight: true },
  { icon: Settings, label: 'Settings', path: '/settings', premium: true },
  { icon: Info, label: 'About', path: '/about', premium: true },
  { icon: Mail, label: 'Contact', path: '/contact', premium: true },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 gradient-main">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          
          <h1 className="text-lg font-bold text-white">JSN Solving</h1>
          
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Sidebar */}
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-card/95 backdrop-blur-xl z-50 border-r border-white/10"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <span className="text-xl font-bold gradient-text">JSN Solving</span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Menu Items */}
                <div className="flex-1 py-4 overflow-y-auto">
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-primary/20 text-primary'
                            : item.highlight
                            ? 'bg-gradient-to-r from-magenta/20 to-purple/20 text-white hover:from-magenta/30 hover:to-purple/30'
                            : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${item.highlight ? 'text-hot-pink' : ''}`} />
                        <span className="font-medium">{item.label}</span>
                        {item.premium && (
                          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                            PRO
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                  <p className="text-xs text-muted-foreground text-center">
                    Version 1.0.0
                  </p>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
