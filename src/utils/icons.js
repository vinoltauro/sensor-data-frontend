import L from 'leaflet';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icon creator function
export const createCustomIcon = (color, symbol) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        font-size: 16px;
      ">
        ${symbol}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Predefined icons
export const bikeIcon = createCustomIcon('#4CAF50', '🚴');
export const luasGreenIcon = createCustomIcon('#00A651', '🚊');
export const luasRedIcon = createCustomIcon('#E4002B', '🚊');
export const userIcon = createCustomIcon('#2196F3', '📍');

// Get bike icon based on availability
export const getBikeIcon = (station) => {
  const available = station.available_bikes || 0;
  if (available === 0) return createCustomIcon('#F44336', '🚴'); // Red - no bikes
  if (available < 5) return createCustomIcon('#FF9800', '🚴'); // Orange - few bikes
  return bikeIcon; // Green - bikes available
};
