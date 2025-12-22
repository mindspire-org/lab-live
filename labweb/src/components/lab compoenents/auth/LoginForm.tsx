import { useState, useEffect } from "react";
import { UserRole } from "@/lab types/user";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { useAuth } from "@/lab context/AuthContext";

interface LoginFormProps {
  onLogin: (role: UserRole) => void;
  onShowSignup: () => void;
}

const LoginForm = ({ onLogin, onShowSignup }: LoginFormProps) => {
  // role will now be determined by backend response

  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    identifier: "",
    password: ""
  });
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [labName, setLabName] = useState(() => {
    try {
      const cached = typeof window !== 'undefined' ? window.localStorage.getItem('labName') : null;
      return String(cached || '').trim();
    } catch {
      return '';
    }
  });
  const { login } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/lab/settings");
        if (!res.ok) return;
        const json = await res.json();
        const name = json?.lab?.labName || json?.labName;
        if (name && typeof name === 'string') {
          const trimmed = name.trim();
          setLabName(trimmed);
          try {
            window.localStorage.setItem('labName', trimmed);
          } catch {}
        }
      } catch {}
    })();
  }, []);

  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isUsername = (value: string) => /^[a-zA-Z0-9._-]{3,}$/.test(value);

  const validate = () => {
    const next: { identifier?: string; password?: string } = {};
    const ident = (credentials.identifier || '').trim();
    const pass = String(credentials.password || '');

    if (!ident) {
      next.identifier = 'Username or email is required.';
    } else if (!isEmail(ident) && !isUsername(ident)) {
      next.identifier = 'Enter a valid email or username.';
    }

    if (!pass) {
      next.password = 'Password is required.';
    } else if (pass.length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }

    return next;
  };

  const handleLogin = async () => {
    const fieldErrors = validate();
    if (fieldErrors.identifier || fieldErrors.password) {
      setErrors((prev) => ({ ...prev, ...fieldErrors, form: undefined }));
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, form: undefined }));
    try {
      const ident = (credentials.identifier || '').trim();
      const result = await login(ident, credentials.password);
      onLogin((result.role as UserRole) || 'lab-technician');
    } catch (e: any) {
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.message;
      const rawMsg = e?.message;

      let friendly = 'Unable to login. Please try again.';

      if (status === 400 || status === 401) {
        friendly = 'Invalid username/email or password.';
      } else if (status === 403) {
        friendly = 'Your account does not have access. Please contact the administrator.';
      } else if (status === 429) {
        friendly = 'Too many attempts. Please wait a moment and try again.';
      } else if (status >= 500) {
        friendly = 'Server error. Please try again in a few minutes.';
      } else if (String(rawMsg || '').toLowerCase().includes('network')) {
        friendly = 'Network error. Check your internet connection and try again.';
      } else if (typeof serverMsg === 'string' && serverMsg.trim() && !/status code\s*\d+/i.test(serverMsg)) {
        friendly = serverMsg.trim();
      }

      setErrors((prev) => ({ ...prev, form: friendly }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center sm:items-start justify-center bg-gradient-to-br from-blue-500 to-purple-900 transition-all duration-200 relative px-4 sm:px-6 pt-10 sm:pt-24 pb-10 sm:pb-12">

      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto">
        <div className="mb-6 text-center flex flex-col items-center">
          <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-poppins tracking-tight text-white drop-shadow select-none whitespace-normal lg:whitespace-nowrap">
            {labName || 'Loading...'}
          </div>
          <div className="mt-2 text-xs sm:text-sm text-white/80 font-medium">Laboratory Management System</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-indigo-100 px-4 sm:px-7 py-5 sm:py-8 space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <label htmlFor="identifier" className="text-sm font-semibold text-gray-800">Username or Email</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={18} />
              <input
                id="identifier"
                type="text"
                value={credentials.identifier}
                onChange={(e) => {
                  const v = e.target.value;
                  setCredentials({ ...credentials, identifier: v });
                  setErrors((prev) => ({ ...prev, identifier: undefined, form: undefined }));
                }}
                placeholder="Enter username or email"
                required
                className={`w-full pl-12 pr-4 h-11 sm:h-12 text-sm sm:text-base rounded-2xl border bg-white shadow-sm outline-none transition-all font-medium placeholder:text-indigo-300 focus:shadow-indigo-100 ${
                  errors.identifier ? 'border-red-500 focus:border-red-500' : 'border-indigo-200 focus:border-indigo-500'
                }`}
                autoFocus
              />
            </div>
            {errors.identifier ? (
              <div className="text-xs text-red-600">{errors.identifier}</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-semibold text-gray-800">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => {
                  const v = e.target.value;
                  setCredentials({ ...credentials, password: v });
                  setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
                }}
                placeholder="Enter your password"
                required
                className={`w-full pl-12 pr-12 h-11 sm:h-12 text-sm sm:text-base rounded-2xl border bg-white shadow-sm outline-none transition-all font-medium placeholder:text-indigo-300 focus:shadow-indigo-100 ${
                  errors.password ? 'border-red-500 focus:border-red-500' : 'border-indigo-200 focus:border-indigo-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center text-black hover:border-gray-400 transition-colors focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password ? (
              <div className="text-xs text-red-600">{errors.password}</div>
            ) : null}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-bold tracking-wide text-white bg-gradient-to-r from-indigo-800 via-indigo-700 to-blue-600 hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
          {errors.form ? (
            <div className="text-center text-sm text-red-600">{errors.form}</div>
          ) : null}
          <div className="text-center text-indigo-700 text-xs mt-2 break-words">© Developed by MindSpire. All rights reserved.</div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
