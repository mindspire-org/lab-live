import React from 'react';

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}

const BrandHeader: React.FC<BrandHeaderProps> = ({ title, subtitle, right, className }) => {
  const name = (typeof window !== 'undefined' && (localStorage.getItem('hospitalName') || '')) || title || 'Hospital Laboratory';
  return (
    <div className={`flex items-center justify-between ${className || ''}`}>
      <div className="flex items-center gap-3">
        {/* Logo removed intentionally */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          {subtitle && <p className="text-gray-600 -mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
};

export default BrandHeader;
