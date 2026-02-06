import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Puzzle, Trophy, User, Box, ShoppingBag, Settings, Camera, Timer } from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

// Universal navigation items - same on ALL pages for consistency
const mainNavItems: NavItem[] = [
  { icon: Box, label: 'Collection', path: '/collection' },
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Puzzle, label: 'Solver', path: '/solver' },
  { icon: Timer, label: 'Timer', path: '/timer' },
  { icon: User, label: 'Profile', path: '/profile' },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[60px] transition-all duration-200 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${isActive ? 'text-primary' : ''}`} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] md:text-xs font-medium mt-1 tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
