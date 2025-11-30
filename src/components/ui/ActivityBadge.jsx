import React from 'react';
import { getActivityColor } from '../../utils/formatters';

export const ActivityBadge = ({ activity, confidence }) => {
  const color = getActivityColor(activity);

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-bold"
      style={{ backgroundColor: color }}
    >
      <span>{activity || 'Unknown'}</span>
      {confidence && <span className="opacity-90">({confidence}%)</span>}
    </div>
  );
};
