import React from "react";

type TrendType = "" | "trend" | "reference";

interface TrendReferenceLineProps {
  type: TrendType;
  onChange: (type: TrendType) => void;
}

export default function TrendReferenceLine({ type, onChange }: TrendReferenceLineProps) {
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Trend/Reference Line</label>
      <select
        className="border rounded px-2 py-1 w-full"
        value={type}
        onChange={e => onChange(e.target.value as TrendType)}
      >
        <option value="">None</option>
        <option value="trend">Trend Line</option>
        <option value="reference">Reference Line</option>
      </select>
    </div>
  );
}