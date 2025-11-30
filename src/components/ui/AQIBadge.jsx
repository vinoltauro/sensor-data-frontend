import React from 'react';
import { getAQIColor, getAQIEmoji } from '../../utils/formatters';

export const AQIBadge = ({ aqi, category }) => {
  const bgColor = getAQIColor(category);
  const emoji = getAQIEmoji(category);
  const textColor = category === 'Moderate' ? 'text-black' : 'text-white';

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${textColor} text-sm font-bold`}
      style={{ backgroundColor: bgColor }}
    >
      <span>{emoji}</span>
      <span>AQI: {aqi}</span>
      <span>({category})</span>
    </div>
  );
};
