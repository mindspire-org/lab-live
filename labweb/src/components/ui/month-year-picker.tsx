import React from 'react';

type Props = {
  value: string; // YYYY-MM
  onChange: (val: string) => void;
  className?: string;
  id?: string;
  label?: string;
};

// Simple month-year picker using native <input type="month"> fallback
export const MonthYearPicker: React.FC<Props> = ({ value, onChange, className, id, label }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        type="month"
        value={value}
        onChange={handleChange}
        className="border rounded-md h-9 px-2 text-sm"
      />
    </div>
  );
};

export default MonthYearPicker;
