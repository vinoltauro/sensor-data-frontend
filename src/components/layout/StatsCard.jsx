import React from 'react';

export const StatsCard = ({ icon, label, value }) => {
  return (
    <div className="stat-card">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="stat-card-header">{label}</div>
      <div className="stat-card-value">{value}</div>
    </div>
  );
};
