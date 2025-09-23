// components/InfoCard.tsx
import React from "react";

const InfoCard = () => {
  return (
    <div className="bg-white shadow-md rounded-2xl p-6 max-w-md w-full">
      <h2 className="text-xl font-semibold mb-2">About This App</h2>
      <p className="text-gray-700">
        This is a demo component added to show how you can modularize content in a React/Next.js application.
        It uses TailwindCSS for styling and can be reused across your app.
      </p>
    </div>
  );
};

export default InfoCard;
