import React from "react";

interface TableCalculation {
  value: string;
  label: string;
}

interface TableCalcFilterProps {
  value: string;
  onChange: (value: string) => void;
  calcs?: TableCalculation[];
}

export default function TableCalcFilter({ value, onChange, calcs = [] }: TableCalcFilterProps) {
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Table Calculation Filter</label>
      <select
        className="border rounded px-2 py-1 w-full"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select Calculation</option>
        {calcs.map(calc => (
          <option key={calc.value} value={calc.value}>{calc.label}</option>
        ))}
      </select>
    </div>
  );
}