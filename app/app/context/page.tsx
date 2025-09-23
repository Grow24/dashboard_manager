import React from 'react';

// Sample data for the bar chart
const data = [
  { label: 'January', value: 40 },
  { label: 'February', value: 55 },
  { label: 'March', value: 75 },
  { label: 'April', value: 60 },
  { label: 'May', value: 90 },
];

// BarChart component
export default function context() {
  // Find max value for scaling bars
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6 text-center">Monthly Sales</h2>
      <div className="flex items-end space-x-4 h-64">
        {data.map(({ label, value }) => {
          // Calculate height percentage relative to max value
          const heightPercent = (value / maxValue) * 100;

          return (
            <div key={label} className="flex flex-col items-center w-12">
              <div
                className="bg-blue-600 rounded-t-md transition-all duration-300"
                style={{ height: `${heightPercent}%`, width: '100%' }}
                title={`${label}: ${value}`}
              />
              <span className="mt-2 text-sm text-gray-700">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}