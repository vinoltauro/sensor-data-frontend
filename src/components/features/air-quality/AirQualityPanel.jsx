import React from 'react';
import { useData } from '../../../hooks/useData';
import { AQIBadge } from '../../ui/AQIBadge';

export const AirQualityPanel = () => {
  const { airQuality } = useData();

  return (
    <div className="bg-white rounded-xl p-5 mb-5 shadow-md">
      <h3 className="mt-0 mb-3 text-gray-800">🌫️ Air Quality</h3>
      {airQuality && airQuality.aqi ? (
        <div>
          <AQIBadge
            aqi={airQuality.aqi.overall}
            category={airQuality.aqi.category}
          />
          <div className="text-xs text-gray-500 mt-2">
            📍 {airQuality.station_name} ({airQuality.distance?.toFixed(1)} km away)
          </div>
          <div className="text-xs text-gray-500">
            Primary pollutant: {airQuality.aqi.primaryPollutant}
          </div>
        </div>
      ) : (
        <div className="text-gray-400 text-sm">
          Loading air quality data for your location...
        </div>
      )}
    </div>
  );
};
