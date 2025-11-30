import React from 'react';
import { useData } from '../../../hooks/useData';
import { AQIBadge } from '../../ui/AQIBadge';

export const AirQualityPanel = () => {
  const { airQuality } = useData();

  if (!airQuality) return null;

  return (
    <div className="mb-4">
      <AQIBadge
        aqi={airQuality.aqi.overall}
        category={airQuality.aqi.category}
      />
    </div>
  );
};
