import React, { createContext, useState, useRef, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { SessionContext } from './SessionContext';
import { dataAPI, airQualityAPI } from '../utils/api';

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const { authToken } = useContext(AuthContext);
  const { sessionId, isRecording, setCurrentActivity } = useContext(SessionContext);

  const [airQuality, setAirQuality] = useState(null);
  const [healthRecommendation, setHealthRecommendation] = useState(null);
  const [localDataPoints, setLocalDataPoints] = useState(0);
  const [dataPointsCount, setDataPointsCount] = useState(0);

  // Use refs for high-frequency data to avoid re-renders
  const dataBufferRef = useRef([]);
  const accelRef = useRef({ x: 0, y: 0, z: 0 });

  // Continuously update accelerometer values
  useEffect(() => {
    if (!isRecording) return;

    const handleMotion = (event) => {
      const acc = event.accelerationIncludingGravity;
      if (acc && acc.x !== null) {
        accelRef.current = {
          x: acc.x,
          y: acc.y,
          z: acc.z
        };
      }
    };

    console.log('📱 Starting accelerometer listener');
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      console.log('📱 Stopping accelerometer listener');
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isRecording]);

  // Sync data to backend
  const syncDataToBackend = async (data) => {
    if (!data || data.length === 0) return;

    try {
      console.log(`🔄 Syncing ${data.length} points to backend...`);
      const result = await dataAPI.sync(authToken, sessionId, data);
      console.log(`✅ Backend response:`, result.success);

      if (result.success && result.classifiedData) {
        console.log(`✅ Classified ${result.classifiedData.length} points`);

        // Update activity from latest point
        const latest = result.classifiedData[result.classifiedData.length - 1];
        if (latest.activity && latest.activity !== 'unknown') {
          console.log(`🏃 Activity detected: ${latest.activity}`);
          setCurrentActivity({
            activity: latest.activity,
            confidence: latest.activity_confidence
          });
        }

        setDataPointsCount(prev => prev + result.classifiedData.length);
      }
    } catch (error) {
      console.error('❌ Sync error:', error);
    }
  };

  // Check air quality
  const checkAirQuality = async (lat, lng, activity) => {
    try {
      const result = await airQualityAPI.getCurrent(authToken, lat, lng);

      if (result.success && result.data) {
        setAirQuality(result.data);

        // Get health recommendation
        const activityType = activity || 'walking';
        const recResult = await airQualityAPI.getRecommendations(authToken, lat, lng, activityType);

        if (recResult.success) {
          setHealthRecommendation(recResult.recommendation);
        }
      }
    } catch (error) {
      console.error('Air quality check error:', error);
    }
  };

  // Add data point to buffer
  const addDataPoint = (dataPoint) => {
    dataBufferRef.current.push(dataPoint);
    setLocalDataPoints(prev => prev + 1);
    console.log(`📍 Data point #${dataBufferRef.current.length} collected`);
  };

  // Get current accelerometer values
  const getAccelerometerData = () => {
    return accelRef.current;
  };

  // Clear data buffer (for after sync)
  const clearDataBuffer = () => {
    dataBufferRef.current = [];
    setLocalDataPoints(0);
  };

  // Flush buffer (sync and clear)
  const flushDataBuffer = async () => {
    if (dataBufferRef.current.length > 0) {
      await syncDataToBackend([...dataBufferRef.current]);
      clearDataBuffer();
    }
  };

  const value = {
    airQuality,
    healthRecommendation,
    localDataPoints,
    dataPointsCount,
    dataBufferRef,
    accelRef,
    syncDataToBackend,
    checkAirQuality,
    addDataPoint,
    getAccelerometerData,
    clearDataBuffer,
    flushDataBuffer
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
