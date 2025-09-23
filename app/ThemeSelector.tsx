import React from 'react';
// import { useTheme } from './theme-context';

const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mb-4 px-6">
      <label className="mr-2 font-medium text-gray-700">Select Theme:</label>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as any)}
        className="border rounded px-2 py-1"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="custom">Custom</option>
      </select>
    </div>
  );
};

export default ThemeSelector;