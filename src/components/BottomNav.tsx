import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Puzzle, Trophy, User, Camera, Settings } from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface BottomNavProps {
  // variant kept for back-compat but all surfaces now share the SaaS nav
  variant?: 'home' | 'solver' | 'map' | 'collection' | 'profile' | 'timer';
}

// Single SaaS bottom nav across all screens.
const ITEMS: NavItem[] = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Camera, label: 'Scan', path: '/camera' },
  { icon: Puzzle, label: 'Solver', path: '/virtual-cube' },
  { icon: Trophy, label: 'Timer', path: '/timer' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const BottomNav = (_props: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around max-w-xl mx-auto">
        {ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`bottom-nav-item flex-1 ${isActive ? 'active' : ''}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
              <span className="text-[10px] font-medium tracking-wide">
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
