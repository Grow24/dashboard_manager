import React from "react";

interface DataSource {
  value: string;
  label: string;
}

interface DataSourceFilterProps {
  value: string;
  onChange: (value: string) => void;
  sources?: DataSource[];
}

export default function DataSourceFilter({ value, onChange, sources = [] }: DataSourceFilterProps) {
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Data Source Filter</label>
      <select
        className="border rounded px-2 py-1 w-full"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select Data Source</option>
        {sources.map(src => (
          <option key={src.value} value={src.value}>{src.label}</option>
        ))}
      </select>
    </div>
  );
}