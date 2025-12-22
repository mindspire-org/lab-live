import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Secure license key validation for Mindspire signed keys

function base64urlDecode(input: string): string {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  // Use atob for browser compatibility
  return decodeURIComponent(escape(window.atob(input)));
}

async function verifySignature(encoded: string, signature: string): Promise<boolean> {
  const secret = 'mindspire-2025-secure-secret'; // Must match keygen_signed.js
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  const sigBuf = await window.crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(encoded)
  );
  const hex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 16) === signature;
}

async function parseLicenseKey(key: string): Promise<{ customer: string, date: string } | null> {
  const match = key.match(/^mindspire-(.+)-([a-f0-9]{16})$/);
  if (!match) return null;
  const encoded = match[1];
  const signature = match[2];
  if (!(await verifySignature(encoded, signature))) return null;
  try {
    const payload = JSON.parse(base64urlDecode(encoded));
    return { customer: payload.customer, date: payload.date };
  } catch {
    return null;
  }
}

async function validateLicenseKey(key: string): Promise<boolean> {
  return !!(await parseLicenseKey(key));
}

const LicenseActivation = () => {
  const [licenseKey, setLicenseKey] = useState('');
  const [activated, setActivated] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    // Check activation status from localStorage on load
    const checkActivation = async () => {
      const storedKey = localStorage.getItem('licenseKey');
      const valid = storedKey && (await validateLicenseKey(storedKey));
      setActivated(!!valid);
    };
    checkActivation();
  }, []);

  const handleActivate = async () => {
    setError('');
    setValidating(true);
    if (await validateLicenseKey(licenseKey)) {
      localStorage.setItem('licenseKey', licenseKey);
      setShowCongrats(true);
      setTimeout(() => {
        setActivated(true);
        window.location.reload();
      }, 2000); // 2 seconds
    } else {
      setError('Invalid or missing purchase key. Please enter a valid key.');
    }
    setValidating(false);
  };

  const handleDeactivate = () => {
    localStorage.removeItem('licenseKey');
    setActivated(false);
    setLicenseKey('');
  };

  return (
    <div className="min-h-screen w-full flex flex-row items-stretch justify-center bg-gradient-to-br from-[#0f213a] via-[#1e3a5c] to-[#a5b4fc] font-poppins relative overflow-hidden">
      {/* Left Panel */}
      <div className="hidden md:flex flex-col justify-between items-center w-2/5 bg-gradient-to-br from-[#0f213a] via-[#1e3a5c] to-[#a5b4fc] p-12 relative shadow-2xl">
        <div className="flex flex-col items-center w-full mt-10">
          <div className="rounded-2xl shadow-2xl bg-white/10 p-6 mb-8" style={{backdropFilter:'blur(8px)'}}>
            <svg width="108" height="108" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="12" y="36" width="84" height="48" rx="14" fill="#fff" stroke="#38bdf8" strokeWidth="4" />
              <rect x="32" y="20" width="44" height="28" rx="8" fill="#f1f5f9" stroke="#6366f1" strokeWidth="3" />
              <rect x="44" y="10" width="20" height="14" rx="4" fill="#a5b4fc" stroke="#6366f1" strokeWidth="2" />
              <rect x="52" y="16" width="4" height="8" rx="1.5" fill="#fff" />
            </svg>
          </div>
          <h2 className="text-white text-4xl font-extrabold mb-2 drop-shadow-lg">Mindspire Hospital POS</h2>
          <div className="text-indigo-100 text-xl font-semibold mb-6 text-center">Premium Hospital Management Software</div>
        </div>
        <div className="text-center text-indigo-100 text-lg font-medium mt-12">"Activate your future in healthcare."</div>
        <div className="text-center text-xs text-indigo-200 mt-8 mb-2">&copy; {new Date().getFullYear()} <a href="https://mindspire.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-300 transition-colors">Mindspire HealthTech</a></div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white/90 backdrop-blur-xl p-8 md:p-16 relative">
        {/* Floating icons */}
        <div className="absolute top-8 right-16 animate-float-x pointer-events-none opacity-30">
          <svg width="44" height="44" fill="none"><circle cx="22" cy="22" r="22" fill="#a5b4fc" /></svg>
        </div>
        <div className="absolute bottom-8 left-8 animate-float-y pointer-events-none opacity-20">
          <svg width="60" height="60" fill="none"><rect width="60" height="60" rx="18" fill="#38bdf8" /></svg>
        </div>
        <div className="w-full max-w-lg bg-white/95 rounded-3xl shadow-2xl px-10 py-12 flex flex-col items-center relative z-10" style={{boxShadow:'0 16px 48px 0 rgba(16,64,128,0.18),0 2px 8px 0 rgba(0,0,0,0.06)'}}>
          <div className="flex items-center gap-3 mb-8">
            <svg width="32" height="32" fill="none"><circle cx="16" cy="16" r="16" fill="#38bdf8" /></svg>
            <span className="text-2xl font-bold text-indigo-800 tracking-wide">License Activation</span>
            <svg width="32" height="32" fill="none"><rect x="0" y="0" width="32" height="32" rx="8" fill="#a5b4fc" /></svg>
          </div>
          {/* Step indicator */}
          <div className="w-full flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gradient-to-tr from-emerald-400 via-blue-400 to-indigo-400 w-8 h-8 flex items-center justify-center text-white font-bold shadow">1</span>
              <span className="text-indigo-400 font-semibold">Enter Key</span>
              <svg width="24" height="24"><line x1="0" y1="12" x2="24" y2="12" stroke="#a5b4fc" strokeWidth="2" /></svg>
              <span className={`rounded-full w-8 h-8 flex items-center justify-center font-bold shadow ${activated || showCongrats ? 'bg-gradient-to-tr from-green-400 to-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
              <span className={`font-semibold ${activated || showCongrats ? 'text-green-600' : 'text-gray-400'}`}>Activated</span>
            </div>
          </div>
          {/* Main content */}
          {showCongrats ? (
            <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="40" fill="#22c55e" opacity="0.18"/><path d="M24 42l12 12 20-24" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div className="text-3xl text-green-600 font-bold font-poppins">Congratulations!</div>
              <div className="text-green-700 font-semibold font-poppins text-center">Your software has been successfully activated.<br />Redirecting to login...</div>
            </div>
          ) : activated ? (
            <div className="space-y-6 flex flex-col items-center">
              <div className="flex items-center gap-2 text-green-700 font-semibold font-poppins text-lg">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="14" fill="#22c55e" opacity="0.14"/><path d="M8 15l4 4 8-10" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                This copy is activated and licensed.
              </div>
              <Button onClick={handleDeactivate} className="bg-red-600 hover:bg-red-700 font-poppins font-semibold w-full text-lg">Deactivate</Button>
            </div>
          ) : (
            <div className="space-y-6 flex flex-col items-center w-full">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                <svg width="24" height="24" fill="none"><rect x="4" y="4" width="16" height="16" rx="4" fill="#a5b4fc" /></svg>
                Enter your purchase key to activate your software.
              </div>
              <Input
                type="text"
                placeholder="e.g. mindspire-137189347"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value)}
                className="font-poppins border-gray-300 focus:border-indigo-500 text-lg py-3 px-4 rounded-xl"
              />
              {error && <div className="text-red-600 font-poppins text-sm w-full text-center">{error}</div>}
              <Button onClick={handleActivate} className="bg-emerald-600 hover:bg-emerald-700 font-poppins font-semibold w-full text-lg py-3 rounded-xl" disabled={validating}>
                {validating ? 'Validating...' : 'Activate'}
              </Button>
              <div className="flex items-center gap-2 text-gray-400 text-xs mt-2">
                <svg width="18" height="18" fill="none"><circle cx="9" cy="9" r="9" fill="#a5b4fc" /></svg>
                <span>Secure activation. Your key is encrypted and never shared.</span>
              </div>
            </div>
          )}
          <div className="mt-10 text-xs text-gray-400 text-center w-full">Powered by <a href="https://mindspire.org" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-500 underline hover:text-blue-600 transition-colors">Mindspire HealthTech</a></div>
        </div>
        {/* Tailwind keyframes for floating icons */}
        <style>{`
          @keyframes float-y { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-18px);} }
          @keyframes float-x { 0%,100%{transform:translateX(0);} 50%{transform:translateX(20px);} }
          .animate-float-y { animation: float-y 3.2s ease-in-out infinite; }
          .animate-float-x { animation: float-x 4.2s ease-in-out infinite; }
          .animate-fade-in { animation: fade-in 1s cubic-bezier(.4,0,.2,1); }
          @keyframes fade-in { 0%{opacity:0;transform:scale(0.98);} 100%{opacity:1;transform:scale(1);} }
        `}</style>
      </div>
    </div>
  );
};

export default LicenseActivation;
