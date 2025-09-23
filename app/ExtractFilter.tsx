import React from "react";

interface ExtractOption {
  value: string;
  label: string;
}

interface ExtractFilterProps {
  value: string;
  onChange: (value: string) => void;
  options?: ExtractOption[];
}

export default function ExtractFilter({ value, onChange, options = [] }: ExtractFilterProps) {
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Extract Filter</label>
      <select
        className="border rounded px-2 py-1 w-full"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select Extract</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}