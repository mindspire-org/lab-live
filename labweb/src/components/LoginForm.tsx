import React, { useState } from 'react';
import { LogIn, User, Lock, Eye, EyeOff, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

import { Link, useNavigate } from 'react-router-dom';

const LoginForm = () => {
  // Branding from backend settings
  // Default brand if settings are empty
  const DEFAULT_BRAND = 'Mindspire Hospital Management System';
  const [hospitalName, setHospitalName] = React.useState<string>(
    // Use cached value if present, otherwise our default brand
    localStorage.getItem('hospitalName') || DEFAULT_BRAND
  );
  const [hospitalLogo, setHospitalLogo] = React.useState<string | null>(
    localStorage.getItem('hospitalLogo') || null
  );

  // Load branding from server settings and cache locally for faster next load
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const data = await res.json();
        const name = (data?.hospitalName || '').trim();
        const logo = (data?.hospitalLogo || '').trim();
        if (!cancelled) {
          // If API provided a non-empty name, use it and cache; otherwise keep current (localStorage/default)
          if (name) {
            setHospitalName(name);
            try { localStorage.setItem('hospitalName', name); } catch {}
          } else {
            // No name in settings -> enforce default and replace any stale cached value
            setHospitalName(DEFAULT_BRAND);
            try { localStorage.setItem('hospitalName', DEFAULT_BRAND); } catch {}
          }
          if (logo) {
            setHospitalLogo(logo);
            try { localStorage.setItem('hospitalLogo', logo); } catch {}
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await login(username, password);
    
    if (success) {
      toast({
        title: "Login Successful",
        description: "Welcome to the Hospital Management System",
      });
      setTimeout(() => {
        const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (storedUser.role === 'doctor') {
        navigate('/doctor');
      } else if (storedUser.role === 'ipd') {
        navigate('/ipd');
        } else {
          navigate("/tokens");
        }
      }, 500); // Give toast a moment to show
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white transition-all duration-200 relative">
      {/* Home icon to navigate back to the portal */}
      <Link to="/" className="absolute top-5 right-5 text-gray-500 hover:text-gray-700 transition-colors" aria-label="Go to portal">
        <Home size={28} />
      </Link>
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-6 text-center flex flex-col items-center">
          <div className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight drop-shadow-lg bg-gradient-to-r from-indigo-800 via-indigo-700 to-blue-600 bg-clip-text text-transparent select-none">
            {hospitalName}
          </div>
          <div className="mt-2 text-sm text-blue-700 font-medium">Hospital Management System</div>
        </div>
        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-indigo-100 px-7 py-8 space-y-6">
          <div className="space-y-2">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="w-full px-5 py-4 text-base rounded-xl border border-indigo-200 focus:border-indigo-500 bg-white shadow-sm focus:shadow-indigo-100 outline-none transition-all font-medium placeholder:text-indigo-300"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-5 py-4 text-base rounded-xl border border-indigo-200 focus:border-indigo-500 bg-white shadow-sm focus:shadow-indigo-100 outline-none transition-all font-medium placeholder:text-indigo-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-4 rounded-xl text-base font-bold tracking-wide text-white bg-gradient-to-r from-indigo-800 via-indigo-700 to-blue-600 hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:opacity-70"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          <div className="text-center text-blue-700 text-xs mt-2 animate-fade-in">© {new Date().getFullYear()} {hospitalName}. All rights reserved.</div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
