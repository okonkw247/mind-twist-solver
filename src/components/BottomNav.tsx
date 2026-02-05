import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Puzzle, Trophy, User, Map, ShoppingBag, Box, Settings, BarChart3, GraduationCap } from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface BottomNavProps {
  variant?: 'home' | 'solver' | 'map' | 'collection' | 'profile' | 'timer';
}

const navConfigs: Record<string, NavItem[]> = {
  home: [
    { icon: Box, label: 'COLLECTION', path: '/collection' },
    { icon: Home, label: 'HOME', path: '/home' },
    { icon: ShoppingBag, label: 'STORE', path: '/premium' },
  ],
  solver: [
    { icon: Puzzle, label: 'Solver', path: '/solver' },
    { icon: Trophy, label: 'Timer', path: '/timer' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ],
  map: [
    { icon: Map, label: 'MAP', path: '/play-cube' },
    { icon: Box, label: 'CUBES', path: '/collection' },
    { icon: ShoppingBag, label: 'SHOP', path: '/premium' },
    { icon: User, label: 'PROFILE', path: '/profile' },
  ],
  collection: [
    { icon: Puzzle, label: 'PLAY', path: '/play-cube' },
    { icon: Box, label: 'SKINS', path: '/collection' },
    { icon: Trophy, label: 'RANK', path: '/timer' },
    { icon: Settings, label: 'MENU', path: '/settings' },
  ],
  profile: [
    { icon: Puzzle, label: 'Solve', path: '/solver' },
    { icon: BarChart3, label: 'Rankings', path: '/timer' },
    { icon: GraduationCap, label: 'Learn', path: '/premium' },
    { icon: User, label: 'Profile', path: '/profile' },
  ],
  timer: [
    { icon: Puzzle, label: 'Solver', path: '/solver' },
    { icon: Trophy, label: 'Timer', path: '/timer' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ],
};

const BottomNav = ({ variant = 'home' }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const items = navConfigs[variant] || navConfigs.home;

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`bottom-nav-item flex-1 ${isActive ? 'active' : ''}`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : ''}`} />
              <span className="text-[10px] font-semibold tracking-wide uppercase">
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
