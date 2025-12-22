import React from 'react';
import { Bell, User, LogOut } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type HeaderProps = {
  onMenuToggle?: () => void;
};

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { settings } = useSettings();
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-30 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
      <div className="h-full px-4 flex items-center gap-3">
        {/* Left: brand and toggle */}
        <button
          onClick={onMenuToggle}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          aria-label="Toggle sidebar"
        >
          <span className="i-[hamburger]">≡</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold text-indigo-900">{settings.hospitalName || 'Hospital Name'}</div>
          <span className="text-xs text-indigo-600/70 hidden sm:inline">Admin</span>
        </div>

        {/* Center: page title placeholder (can be controlled per page) */}
        <div className="flex-1" />

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50" aria-label="Notifications">
            <Bell className="w-4 h-4" />
          </button>
          <button className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
