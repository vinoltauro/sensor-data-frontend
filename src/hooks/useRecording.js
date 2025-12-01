import { useRef, useEffect } from 'react';
import { useSession } from './useSession';
import { useMap } from './useMap';
import { useData } from './useData';

export const useRecording = () => {
  const { isRecording, sessionId, addToRoutePath } = useSession();
  const { setCurrentPosition } = useMap();
  const { addDataPoint, getAccelerometerData, flushDataBuffer } = useData();

  const watchIdRef = useRef(null);
  const accelSamplingIntervalRef = useRef(null);
  const accelBufferRef = useRef([]);
  const lastGPSPositionRef = useRef(null);

  // High-frequency accelerometer sampling (10 Hz = 100ms interval)
  useEffect(() => {
    if (!isRecording || !sessionId) {
      // Stop accelerometer sampling if not recording
      if (accelSamplingIntervalRef.current) {
        clearInterval(accelSamplingIntervalRef.current);
        accelSamplingIntervalRef.current = null;
      }
      accelBufferRef.current = [];
      return;
    }

    console.log('📱 Starting high-frequency accelerometer sampling (10 Hz)');

    // Sample accelerometer at 10 Hz (every 100ms)
    accelSamplingIntervalRef.current = setInterval(() => {
      const accelData = getAccelerometerData();
      const timestamp = Date.now();

      // Buffer accelerometer reading with timestamp
      accelBufferRef.current.push({
        timestamp,
        accel_x: accelData.x,
        accel_y: accelData.y,
        accel_z: accelData.z,
        accel_magnitude: Math.sqrt(
          accelData.x ** 2 +
          accelData.y ** 2 +
          accelData.z ** 2
        )
      });

      // Keep only last 1 second of data (10 samples at 10 Hz)
      if (accelBufferRef.current.length > 10) {
        accelBufferRef.current.shift();
      }

      // If we have GPS position, send data point with buffered accelerometer data
      if (lastGPSPositionRef.current && accelBufferRef.current.length >= 5) {
        const avgAccel = calculateAverageAccel(accelBufferRef.current);

        const dataPoint = {
          timestamp,
          latitude: lastGPSPositionRef.current.lat,
          longitude: lastGPSPositionRef.current.lng,
          accel_x: avgAccel.x,
          accel_y: avgAccel.y,
          accel_z: avgAccel.z,
          accel_magnitude: avgAccel.magnitude,
          speed: lastGPSPositionRef.current.speed || 0,
          // Include raw accelerometer buffer for better activity detection
          accel_samples: accelBufferRef.current.slice()
        };

        addDataPoint(dataPoint);
      }
    }, 100); // 100ms = 10 Hz sampling rate

    // Cleanup
    return () => {
      if (accelSamplingIntervalRef.current) {
        clearInterval(accelSamplingIntervalRef.current);
        accelSamplingIntervalRef.current = null;
      }
      accelBufferRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, sessionId]);

  // GPS tracking (1 Hz)
  useEffect(() => {
    if (!isRecording || !sessionId) {
      // Stop GPS tracking if not recording
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      lastGPSPositionRef.current = null;
      return;
    }

    // Start GPS tracking at normal rate (~1 Hz)
    console.log('🎯 Starting GPS tracking');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed || 0
        };

        // Update position and route
        setCurrentPosition(newPos);
        addToRoutePath(newPos);

        // Store latest GPS position for accelerometer samples
        lastGPSPositionRef.current = newPos;
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

// Helper function to calculate average accelerometer values
function calculateAverageAccel(samples) {
  if (samples.length === 0) return { x: 0, y: 0, z: 0, magnitude: 0 };

  const sum = samples.reduce((acc, sample) => ({
    x: acc.x + sample.accel_x,
    y: acc.y + sample.accel_y,
    z: acc.z + sample.accel_z,
    magnitude: acc.magnitude + sample.accel_magnitude
  }), { x: 0, y: 0, z: 0, magnitude: 0 });

  return {
    x: sum.x / samples.length,
    y: sum.y / samples.length,
    z: sum.z / samples.length,
    magnitude: sum.magnitude / samples.length
  };
}
