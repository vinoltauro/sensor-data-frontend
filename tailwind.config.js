/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#4285F4', // Google Blue
          600: '#1E88E5',
          700: '#1976D2',
        },
        // Activity colors
        'activity-standing': '#9E9E9E',
        'activity-walking': '#4CAF50',
        'activity-running': '#F44336',
        'activity-cycling': '#2196F3',
        'activity-vehicle': '#FF9800',
        // AQI colors
        'aqi-good': '#00E400',
        'aqi-moderate': '#FFFF00',
        'aqi-unhealthy-sensitive': '#FF7E00',
        'aqi-unhealthy': '#FF0000',
        'aqi-very-unhealthy': '#8F3F97',
        'aqi-hazardous': '#7E0023',
      },
    },
  },
  plugins: [],
}
