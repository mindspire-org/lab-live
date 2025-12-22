import React, { useState } from 'react';
import { Hospital, ShieldCheck, Loader2, HeartPulse, Stethoscope, Plus } from 'lucide-react';

// 3D effect and hospital-premium VIP installer screen for Electron
interface InstallerScreenProps {
  onComplete?: () => void;
}

const steps = [
  { label: 'Welcome', icon: <ShieldCheck className="w-7 h-7 text-emerald-500" /> },
  { label: 'Checking System', icon: <Stethoscope className="w-7 h-7 text-blue-400" /> },
  { label: 'Installing', icon: <Hospital className="w-7 h-7 text-blue-700" /> },
  { label: 'Finishing', icon: <HeartPulse className="w-7 h-7 text-pink-500" /> },
];

const InstallerScreen: React.FC<InstallerScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [installing, setInstalling] = useState(false);

  // Animate progress through steps after clicking Start Installation
  React.useEffect(() => {
    if (installing && step < steps.length) {
      const timeout = setTimeout(() => {
        setProgress(((step + 1) / steps.length) * 100);
        setStep((s) => s + 1);
      }, 1200);
      return () => clearTimeout(timeout);
    }
    if (installing && step === steps.length && onComplete) {
      setTimeout(onComplete, 900);
    }
  }, [installing, step, onComplete]);

  return (
    <div className="min-h-screen w-full flex flex-row items-stretch justify-center bg-gradient-to-br from-[#0f213a] via-[#1e3a5c] to-[#2dd4bf] font-poppins">
      {/* Left Panel */}
      <div className="hidden md:flex flex-col justify-between items-center w-2/5 bg-gradient-to-br from-[#0f213a] via-[#1e3a5c] to-[#2dd4bf] p-12 relative shadow-2xl">
        <div className="flex flex-col items-center w-full mt-10">
          <div className="rounded-2xl shadow-2xl bg-white/10 p-6 mb-8" style={{backdropFilter:'blur(8px)'}}>
            <Hospital className="w-32 h-32 text-emerald-400 drop-shadow-xl animate-float3d" />
          </div>
          <h2 className="text-white text-4xl font-extrabold mb-2 drop-shadow-lg">Mindspire Hospital POS</h2>
          <div className="text-emerald-200 text-xl font-semibold mb-6 text-center">Premium Hospital Management Software</div>
          <div className="w-64 h-64 flex items-center justify-center">
            {/* 3D SVG or hospital illustration */}
            <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="110" cy="170" rx="90" ry="10" fill="#164e63" opacity="0.2" />
              <rect x="40" y="80" width="140" height="60" rx="18" fill="#fff" stroke="#38bdf8" strokeWidth="4" filter="url(#shadow)" />
              <rect x="72" y="50" width="76" height="40" rx="12" fill="#f1f5f9" stroke="#2dd4bf" strokeWidth="3" />
              <rect x="92" y="28" width="36" height="26" rx="8" fill="#bae6fd" stroke="#0ea5e9" strokeWidth="2" />
              <rect x="104" y="18" width="12" height="12" rx="3" fill="#38bdf8" stroke="#0369a1" strokeWidth="2" />
              <rect x="108" y="22" width="4" height="8" rx="1.5" fill="#fff" />
              <defs>
                <filter id="shadow" x="30" y="70" width="160" height="80" filterUnits="userSpaceOnUse">
                  <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#bae6fd"/>
                </filter>
              </defs>
            </svg>
          </div>
        </div>
        <div className="text-center text-emerald-100 text-lg font-medium mt-12">"Empowering Healthcare, One Click at a Time."</div>
        <div className="text-center text-xs text-emerald-300 mt-8 mb-2">&copy; {new Date().getFullYear()} Mindspire HealthTech</div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white/90 backdrop-blur-xl p-8 md:p-16">
        <div className="w-full max-w-xl bg-white/95 rounded-3xl shadow-2xl px-10 py-12 flex flex-col items-center" style={{boxShadow:'0 16px 48px 0 rgba(16,64,128,0.18),0 2px 8px 0 rgba(0,0,0,0.06)'}}>
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-8 drop-shadow-lg text-center tracking-wide">Installer</h1>
          {/* Stepper Vertical */}
          <div className="flex flex-row md:flex-col items-center md:items-start gap-8 w-full mb-10">
            <div className="flex flex-row md:flex-col gap-6 md:gap-8 items-center md:items-start">
              {steps.map((s, idx) => (
                <div key={s.label} className={`flex flex-row md:flex-col items-center md:items-start gap-2 md:gap-3 ${step > idx ? 'fade-slide-enter' : step === idx ? 'fade-slide-enter-active' : 'fade-slide-exit'}`}>
                  <div className={`rounded-full border-4 ${step > idx ? 'border-emerald-400 bg-emerald-400' : step === idx ? 'border-blue-500 bg-white' : 'border-gray-200 bg-gray-100'} w-12 h-12 flex items-center justify-center shadow-lg transition-all duration-300`}>{s.icon}</div>
                  <span className={`text-base font-semibold ${step === idx ? 'text-blue-700' : step > idx ? 'text-emerald-500' : 'text-gray-400'} transition-all duration-300`}>{s.label}</span>
                </div>
              ))}
            </div>
            {/* Progress Bar */}
            <div className="flex-1 flex flex-col justify-center md:justify-start w-full md:w-3/5 mt-2 md:mt-0">
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-4 bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 rounded-full animate-shimmer transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">{Math.round(progress)}%</div>
            </div>
          </div>
          {/* Install Details */}
          <div className="w-full flex flex-col items-center mt-2">
            {!installing ? (
              <button
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-bold text-xl py-4 rounded-xl shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-200 mb-2"
                onClick={() => { setInstalling(true); setStep(0); setProgress(0); }}
              >
                Start Installation
              </button>
            ) : (
              <div className="flex items-center gap-3 text-emerald-700 font-semibold text-xl mt-2 animate-pulse">
                <Loader2 className="animate-spin w-7 h-7" />
                {step < steps.length ? steps[step].label + '...' : 'Finishing...'}
              </div>
            )}
          </div>
          <div className="mt-12 text-xs text-gray-400 text-center w-full">Powered by <a href="https://mindspire.org" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-500 underline hover:text-blue-600 transition-colors">Mindspire HealthTech</a></div>
        </div>
      </div>
      {/* Tailwind keyframes for floating icons and shimmer */}
      <style>{`
        @keyframes float3d {
          0%, 100% { transform: translateY(0) scale(1.05) rotate(-4deg); }
          50% { transform: translateY(-16px) scale(1.15) rotate(4deg); }
        }
        .animate-float3d { animation: float3d 2.4s ease-in-out infinite; }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 2.5s linear infinite;
        }
        .fade-slide-enter {
          opacity: 0;
          transform: translateY(24px);
        }
        .fade-slide-enter-active {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 700ms, transform 700ms;
        }
        .fade-slide-exit {
          opacity: 1;
          transform: translateY(0);
        }
        .fade-slide-exit-active {
          opacity: 0;
          transform: translateY(-24px);
          transition: opacity 700ms, transform 700ms;
        }
      `}</style>
    </div>
  );
};

export default InstallerScreen;
