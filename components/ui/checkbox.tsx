// components/ui/checkbox.tsx

import React from "react";

export const Checkbox = ({ id, checked, onCheckedChange }: {
  id: string;
  checked: boolean;
  onCheckedChange: () => void;
}) => {
  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={onCheckedChange}
      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
    />
  );
};
