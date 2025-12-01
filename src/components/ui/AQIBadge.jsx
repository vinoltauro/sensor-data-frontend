import React from 'react';
import { getAQIColor, getAQIEmoji } from '../../utils/formatters';

export const AQIBadge = ({ aqi, category }) => {
  const bgColor = getAQIColor(category);
  const emoji = getAQIEmoji(category);
  // Use black text for Moderate (yellow background) for better readability
  const textColor = category?.toLowerCase() === 'moderate' ? 'text-black' : 'text-white';

  // Capitalize first letter for display
  const displayCategory = category ?
    category.charAt(0).toUpperCase() + category.slice(1).toLowerCase() :
    'Unknown';

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${textColor} text-sm font-bold`}
      style={{ backgroundColor: bgColor }}
    >
      <span>{emoji}</span>
      <span>AQI: {aqi}</span>
      <span>({displayCategory})</span>
    </div>
  );
};
