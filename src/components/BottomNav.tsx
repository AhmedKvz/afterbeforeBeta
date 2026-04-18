import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Heart, Trophy, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Note: "Explore" je izbačen iz BottomNav-a u korist "Izazovi" (/challenges).
// Explore je i dalje dostupan na ruti /explore i može se linkovati iz Home-a.
const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/challenges', icon: Trophy, label: 'Izazovi' },
  { path: '/matches', icon: Heart, label: 'Matches' },
  { path: '/wallet', icon: Wallet, label: 'Wallet' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive =
          item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
        const Icon = item.icon;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn('bottom-nav-item', isActive && 'active')}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
