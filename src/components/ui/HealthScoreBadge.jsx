import React from 'react';

export const HealthScoreBadge = ({ score, rating }) => {
  if (!score) return null;

  const bgColor = score >= 7 ? 'bg-green-50' : score >= 5 ? 'bg-orange-50' : 'bg-red-50';
  const borderColor = score >= 7 ? 'border-green-500' : score >= 5 ? 'border-orange-500' : 'border-red-500';

  return (
    <div className={`p-4 rounded-xl ${bgColor} border-2 ${borderColor} text-center`}>
      <div className="text-sm text-gray-600 mb-1">Health Score</div>
      <div className="text-3xl font-bold text-gray-800">{score}/10</div>
      {rating && (
        <div className="text-lg mt-1">
          {rating.emoji} {rating.label}
        </div>
      )}
    </div>
  );
};
