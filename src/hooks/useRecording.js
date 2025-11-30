import { useRef, useEffect } from 'react';
import { useSession } from './useSession';
import { useMap } from './useMap';
import { useData } from './useData';

export const useRecording = () => {
  const { isRecording, sessionId, addToRoutePath } = useSession();
  const { setCurrentPosition } = useMap();
  const { addDataPoint, getAccelerometerData, flushDataBuffer } = useData();

  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!isRecording || !sessionId) {
      // Stop GPS tracking if not recording
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    // Start GPS tracking - THIS DRIVES DATA COLLECTION
    console.log('🎯 Starting GPS-driven data collection');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Update position and route
        setCurrentPosition(newPos);
        addToRoutePath(newPos);

        // Create data point with CURRENT accelerometer values
        const accelData = getAccelerometerData();
        const dataPoint = {
          timestamp: Date.now(),
          latitude: newPos.lat,
          longitude: newPos.lng,
          accel_x: accelData.x,
          accel_y: accelData.y,
          accel_z: accelData.z,
          accel_magnitude: Math.sqrt(
            accelData.x ** 2 +
            accelData.y ** 2 +
            accelData.z ** 2
          ),
          speed: position.coords.speed || 0
        };

        // Add to buffer
        addDataPoint(dataPoint);
      },
      (error) => {
        console.error('❌ GPS error:', error);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    // Cleanup on unmount
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Flush any remaining data
      flushDataBuffer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, sessionId]);

  return null; // This hook manages side effects only
};
