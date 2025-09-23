import React from "react";

interface Measure {
  value: string;
  label: string;
}

interface MeasureFilterProps {
  value: string;
  onChange: (value: string) => void;
  measures?: Measure[];
}

export default function MeasureFilter({ value, onChange, measures = [] }: MeasureFilterProps) {
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Measure Filter</label>
      <select
        className="border rounded px-2 py-1 w-full"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select Measure</option>
        {measures.map(measure => (
          <option key={measure.value} value={measure.value}>{measure.label}</option>
        ))}
      </select>
    </div>
  );
}