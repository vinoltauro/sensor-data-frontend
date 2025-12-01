import { ACTIVITY_COLORS, AQI_COLORS, AQI_EMOJIS } from './constants';

// Format duration in seconds to human readable
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

// Format distance in kilometers
export const formatDistance = (km) => {
  if (km === null || km === undefined) return '0 km';
  return `${km.toFixed(2)} km`;
};

// Format timestamp to date string
export const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';

  // Handle Firestore timestamp format
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toLocaleDateString();
  }

  // Handle toDate() method
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleDateString();
  }

  // Handle regular Date object or string
  return new Date(timestamp).toLocaleDateString();
};

// Format timestamp to time string
export const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';

  // Handle Firestore timestamp format
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toLocaleTimeString();
  }

  // Handle toDate() method
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleTimeString();
  }

  // Handle regular Date object or string
  return new Date(timestamp).toLocaleTimeString();
};

// Format timestamp to both date and time
export const formatDateTime = (timestamp) => {
  return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
};

// Get activity color
export const getActivityColor = (activity) => {
  return ACTIVITY_COLORS[activity?.toLowerCase()] || ACTIVITY_COLORS.unknown;
};

// Capitalize first letter of each word
const capitalizeCategory = (category) => {
  if (!category) return '';
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Get AQI color
export const getAQIColor = (category) => {
  const formattedCategory = capitalizeCategory(category);
  return AQI_COLORS[formattedCategory] || '#9E9E9E';
};

// Get AQI emoji
export const getAQIEmoji = (category) => {
  const formattedCategory = capitalizeCategory(category);
  return AQI_EMOJIS[formattedCategory] || '❓';
};

// Format steps with comma separator
export const formatSteps = (steps) => {
  if (steps === null || steps === undefined) return '0';
  return steps.toLocaleString();
};
