import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Trophy, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Scene' },
  { path: '/leaderboards', icon: Trophy, label: 'Ranks' },
  { path: '/matches', icon: Heart, label: 'Matches' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
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
