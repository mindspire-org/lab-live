import React from "react";

interface MonthYearPickerProps {
  value: string;          // "YYYY-MM"
  onChange: (val: string) => void;
  startYear?: number;
  endYear?: number;
  className?: string;
}

const months = [
  "01","02","03","04","05","06","07","08","09","10","11","12"
];

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  value,
  onChange,
  startYear = 2000,
  endYear = new Date().getFullYear() + 5,
  className = "",
}) => {
  const [year, month] = value.split("-");

  return (
    <div className={`flex gap-2 items-center ${className}`}>      <select
        className="border rounded p-1"
        value={month}
        onChange={(e) => onChange(`${year}-${e.target.value}`)}
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        className="border rounded p-1"
        value={year}
        onChange={(e) => onChange(`${e.target.value}-${month}`)}
      >
        {Array.from({ length: endYear - startYear + 1 }, (_, i) =>
          (startYear + i).toString()
        ).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
};

export { MonthYearPicker };
export default MonthYearPicker;
