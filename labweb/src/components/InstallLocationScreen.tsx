import React, { useState } from 'react';
import { Folder, HardDrive, Info } from 'lucide-react';

// 3D, modern install location screen for desktop installer
interface InstallLocationScreenProps {
  onComplete?: () => void;
}

const InstallLocationScreen: React.FC<InstallLocationScreenProps> = ({ onComplete }) => {
  const [installPath, setInstallPath] = useState('C:\\Program Files\\Hospital POS');
  const [spaceRequired] = useState('504.6 MB');
  const [spaceAvailable] = useState('2.2 GB');

  // Browse button handler (stub for desktop integration)
  const handleBrowse = async () => {
    if (window.electronAPI?.openFolderDialog) {
      const folder = await window.electronAPI.openFolderDialog();
      if (folder) setInstallPath(folder);
    }
  };


  // Install button handler (stub)
  const handleInstall = () => {
    if (onComplete) onComplete();
    // alert('Installation started! (Integrate real logic here)');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-emerald-50 to-white relative font-poppins">
      <div className="relative bg-white/80 rounded-3xl shadow-3xl backdrop-blur-2xl p-10 max-w-xl w-full flex flex-col gap-6"
        style={{ boxShadow: '0 16px 48px rgba(16,64,128,0.18), 0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Folder className="w-10 h-10 text-emerald-400 drop-shadow-xl" />
          <h2 className="text-2xl font-bold text-blue-900 drop-shadow">Choose Install Location</h2>
        </div>
        <p className="text-gray-600 mb-2">Choose the folder in which to install Hospital POS.</p>
        {/* Install Path */}
        <div className="flex items-center gap-2">
          <input
            className="flex-1 px-4 py-3 rounded-xl border border-blue-200 shadow focus:ring-2 focus:ring-emerald-400 text-lg bg-white/80"
            value={installPath}
            onChange={e => setInstallPath(e.target.value)}
          />
          <button
            className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-5 py-2 rounded-xl shadow-lg font-bold hover:scale-105 transition"
            onClick={handleBrowse}
          >Browse…</button>
        </div>
        {/* Space Info */}
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <span><HardDrive className="inline w-4 h-4 mr-1 text-blue-400" />Space required: <span className="text-blue-700 font-bold">{spaceRequired}</span></span>
          <span><Info className="inline w-4 h-4 mr-1 text-emerald-400" />Space available: <span className="text-emerald-600 font-bold">{spaceAvailable}</span></span>
        </div>
        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <button className="px-6 py-2 rounded-xl bg-gray-200 font-semibold hover:bg-gray-300">Cancel</button>
          <button className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-bold shadow-lg hover:scale-105 transition" onClick={handleInstall}>Install</button>
        </div>
        {/* Branding */}
        <div className="text-center text-xs text-gray-400 mt-6">
          Powered by <a href="https://mindspire.org" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-500 underline hover:text-blue-600">Mindspire HealthTech</a>
        </div>
      </div>
      {/* Optional: floating 3D icons */}
    </div>
  );
};

export default InstallLocationScreen;

