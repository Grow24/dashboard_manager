import React from "react";

interface Context {
  value: string;
  label: string;
}

interface ContextFilterProps {
  value: string;
  onChange: (value: string) => void;
  contexts?: Context[];
}

export default function ContextFilter({ value, onChange, contexts = [] }: ContextFilterProps) {
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Context Filter</label>
      <select
        className="border rounded px-2 py-1 w-full"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select Context</option>
        {contexts.map(ctx => (
          <option key={ctx.value} value={ctx.value}>{ctx.label}</option>
        ))}
      </select>
    </div>
  );
}