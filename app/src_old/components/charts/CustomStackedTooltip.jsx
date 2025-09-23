export function CustomStackedTooltip({ active, payload, label }) {
    if (!active || !payload || payload.length === 0) return null;
  
    return (
      <div className="bg-white p-2 border rounded shadow text-sm">
        <div className="font-semibold mb-1">{label}</div>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex justify-between">
            <span style={{ color: entry.color }}>{entry.dataKey}</span>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }