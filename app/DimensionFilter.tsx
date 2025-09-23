import React from "react";

interface Dimension {
  value: string;
  label: string;
}

interface DimensionFilterProps {
  value: string;
  onChange: (value: string) => void;
  dimensions?: Dimension[];
}

export default function DimensionFilter({ value, onChange, dimensions = [] }: DimensionFilterProps) {
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Dimension Filter</label>
      <select
        className="border rounded px-2 py-1 w-full"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select Dimension</option>
        {dimensions.map(dim => (
          <option key={dim.value} value={dim.value}>{dim.label}</option>
        ))}
      </select>
    </div>
  );
}