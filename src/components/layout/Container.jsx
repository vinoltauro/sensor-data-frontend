import React from 'react';

export const Container = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 p-5">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
};
