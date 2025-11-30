import React from 'react';
import { useData } from '../../../hooks/useData';

export const HealthRecommendationPanel = () => {
  const { healthRecommendation } = useData();

  if (!healthRecommendation) return null;

  return (
    <div
      className="rounded-xl p-5 mb-5 border-2"
      style={{
        backgroundColor: healthRecommendation.safeToExercise ? '#E8F5E9' : '#FFF3E0',
        borderColor: healthRecommendation.safeToExercise ? '#4CAF50' : '#FF9800'
      }}
    >
      <h3 className="mt-0 mb-3 text-gray-800">💚 Health Recommendation</h3>
      <ul className="m-0 pl-5 text-gray-700">
        {healthRecommendation.nearestStation && (
          <li>
            Nearest air quality station: {healthRecommendation.nearestStation} (
            {healthRecommendation.distance?.toFixed(1)} km away)
          </li>
        )}
        {healthRecommendation.primaryPollutant && (
          <li>Primary pollutant: {healthRecommendation.primaryPollutant}</li>
        )}
        {healthRecommendation.safeToExercise !== undefined && (
          <li>
            {healthRecommendation.safeToExercise
              ? '✅ Safe to exercise outdoors'
              : '⚠️ Consider exercising indoors'}
          </li>
        )}
      </ul>
    </div>
  );
};
