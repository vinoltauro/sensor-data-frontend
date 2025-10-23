import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Updated to use your deployed backend
const API_URL = 'https://sensor-data-backend.onrender.com';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [dataPoints, setDataPoints] = useState(0);
  const [localDataPoints, setLocalDataPoints] = useState(0);
  const [status, setStatus] = useState('Ready to collect data');
  const [gpsSupported, setGpsSupported] = useState(false);
  const [accelSupported, setAccelSupported] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncErrors, setSyncErrors] = useState(0);
  
  const dataBuffer = useRef([]);
  const gpsWatchId = useRef(null);
  const accelRef = useRef({ x: 0, y: 0, z: 0 });
  const startTime = useRef(null);

  // Check sensor support on mount
  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      setStatus(prev => prev.replace('OFFLINE', 'Online'));
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setStatus('OFFLINE - Data will be buffered locally');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check GPS support
    if ('geolocation' in navigator) {
      setGpsSupported(true);
      setStatus('GPS: Available ✓');
    } else {
      setStatus('GPS: Not supported ✗');
    }

    // Check accelerometer support
    if (window.DeviceMotionEvent) {
      setAccelSupported(true);
      setStatus(prev => prev + ' | Accelerometer: Available ✓');
    } else {
      setStatus(prev => prev + ' | Accelerometer: Not supported ✗');
    }

    // Request motion permission for iOS
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            setAccelSupported(true);
          }
        })
        .catch(console.error);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle accelerometer updates
  useEffect(() => {
    const handleMotion = (event) => {
      if (event.accelerationIncludingGravity) {
        accelRef.current = {
          x: event.accelerationIncludingGravity.x || 0,
          y: event.accelerationIncludingGravity.y || 0,
          z: event.accelerationIncludingGravity.z || 0
        };
      }
    };

    if (isRecording && accelSupported) {
      window.addEventListener('devicemotion', handleMotion);
      return () => window.removeEventListener('devicemotion', handleMotion);
    }
  }, [isRecording, accelSupported]);

  // Sync data to server every 5 seconds
  useEffect(() => {
    if (!isRecording) return;

    const syncInterval = setInterval(async () => {
      if (dataBuffer.current.length > 0 && isOnline) {
        try {
          const dataToSend = [...dataBuffer.current];
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch(`${API_URL}/api/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: dataToSend }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }

          const result = await response.json();
          if (result.success) {
            // Only clear buffer after successful sync
            dataBuffer.current = [];
            setDataPoints(result.totalPoints);
            setLastSync(new Date().toLocaleTimeString());
            setSyncErrors(0);
            setStatus(`Recording... Synced ${dataToSend.length} points`);
          }
        } catch (error) {
          console.error('Sync error:', error);
          setSyncErrors(prev => prev + 1);
          
          if (error.name === 'AbortError') {
            setStatus('Sync timeout - data buffered locally');
          } else if (!isOnline) {
            setStatus('OFFLINE - Data buffered locally');
          } else {
            setStatus(`Sync error (${syncErrors + 1}) - data buffered`);
          }
          
          // Keep data in buffer for retry
        }
      } else if (dataBuffer.current.length > 0 && !isOnline) {
        setStatus(`OFFLINE - ${dataBuffer.current.length} points buffered`);
      }
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [isRecording, isOnline, syncErrors]);

  const startRecording = async () => {
    try {
      if (!isOnline) {
        setStatus('OFFLINE - Recording will buffer data locally');
      }

      // Try to start new session on backend
      if (isOnline) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(`${API_URL}/api/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const result = await response.json();
          setSessionId(result.sessionId);
        } catch (error) {
          console.error('Session start error:', error);
          // Continue anyway with local session ID
          setSessionId(Date.now().toString());
          setStatus('Backend unavailable - recording locally');
        }
      } else {
        setSessionId(Date.now().toString());
      }
      
      startTime.current = Date.now();
      setIsRecording(true);
      setDataPoints(0);
      setLocalDataPoints(0);
      setSyncErrors(0);
      dataBuffer.current = [];
      setStatus(isOnline ? 'Recording started...' : 'Recording OFFLINE - data buffered');

      // Start GPS tracking
      if (gpsSupported) {
        gpsWatchId.current = navigator.geolocation.watchPosition(
          (position) => {
            const dataPoint = {
              timestamp: Date.now(),
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude,
              speed: position.coords.speed,
              accuracy: position.coords.accuracy,
              heading: position.coords.heading,
              accel_x: accelRef.current.x,
              accel_y: accelRef.current.y,
              accel_z: accelRef.current.z,
              accel_magnitude: Math.sqrt(
                accelRef.current.x ** 2 + 
                accelRef.current.y ** 2 + 
                accelRef.current.z ** 2
              )
            };

            dataBuffer.current.push(dataPoint);
            setLocalDataPoints(prev => prev + 1);
            
            const statusPrefix = isOnline ? 'Recording...' : 'OFFLINE -';
            setStatus(`${statusPrefix} ${dataBuffer.current.length} points buffered`);
          },
          (error) => {
            console.error('GPS error:', error);
            setStatus(`GPS error: ${error.message}`);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 15000
          }
        );
      }
    } catch (error) {
      console.error('Start error:', error);
      setStatus('Error starting - check backend connection');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    
    // Stop GPS tracking
    if (gpsWatchId.current) {
      navigator.geolocation.clearWatch(gpsWatchId.current);
      gpsWatchId.current = null;
    }

    // Send any remaining data if online
    if (dataBuffer.current.length > 0 && isOnline) {
      setStatus('Syncing final data...');
      let retries = 3;
      
      while (retries > 0 && dataBuffer.current.length > 0) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          await fetch(`${API_URL}/api/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: dataBuffer.current }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          dataBuffer.current = [];
          break;
        } catch (error) {
          console.error('Final sync error:', error);
          retries--;
          if (retries > 0) {
            setStatus(`Retry syncing... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
    }

    // Stop session if online
    if (isOnline) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        await fetch(`${API_URL}/api/session/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('Stop session error:', error);
      }
    }

    if (dataBuffer.current.length > 0) {
      setStatus(`Recording stopped. ${dataBuffer.current.length} points not synced - check connection`);
    } else {
      setStatus('Recording stopped. Ready to download.');
    }
  };

  const downloadCSV = async () => {
    if (!isOnline) {
      setStatus('Cannot download - you are offline');
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${API_URL}/api/data/download`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sensor_data_${sessionId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setStatus('CSV downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      if (error.name === 'AbortError') {
        setStatus('Download timeout - try again');
      } else {
        setStatus('Download error - check connection');
      }
    }
  };

  const requestPermissions = async () => {
    // For iOS devices - request motion permission
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        if (response === 'granted') {
          setAccelSupported(true);
          setStatus('Permissions granted! Ready to record.');
        }
      } catch (error) {
        setStatus('Permission denied');
      }
    }

    // Request location permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setStatus('Location permission granted!'),
        (error) => setStatus(`Location error: ${error.message}`)
      );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📱 Sensor Data Collector</h1>
        <p className="subtitle">CS7NS4 Assignment 2</p>
      </header>

      <div className="container">
        <div className="status-card">
          <h2>Status</h2>
          <p className={isRecording ? 'recording' : ''}>{status}</p>
          {lastSync && <p className="sync-time">Last sync: {lastSync}</p>}
        </div>

        <div className="sensor-status">
          <div className={`sensor-badge ${isOnline ? 'supported' : 'unsupported'}`}>
            Network: {isOnline ? '✓ Online' : '✗ Offline'}
          </div>
          <div className={`sensor-badge ${gpsSupported ? 'supported' : 'unsupported'}`}>
            GPS: {gpsSupported ? '✓' : '✗'}
          </div>
          <div className={`sensor-badge ${accelSupported ? 'supported' : 'unsupported'}`}>
            Accelerometer: {accelSupported ? '✓' : '✗'}
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Local Buffer</h3>
            <p className="stat-number">{localDataPoints}</p>
          </div>
          <div className="stat-card">
            <h3>Server Points</h3>
            <p className="stat-number">{dataPoints}</p>
          </div>
          <div className="stat-card">
            <h3>Sync Errors</h3>
            <p className="stat-number">{syncErrors}</p>
          </div>
          <div className="stat-card">
            <h3>Duration</h3>
            <p className="stat-number">
              {startTime.current && isRecording
                ? Math.floor((Date.now() - startTime.current) / 1000) + 's'
                : '0s'}
            </p>
          </div>
        </div>

        <div className="controls">
          {!gpsSupported || !accelSupported ? (
            <button onClick={requestPermissions} className="btn btn-primary">
              Grant Permissions
            </button>
          ) : null}

          {!isRecording ? (
            <button 
              onClick={startRecording} 
              className="btn btn-start"
              disabled={!gpsSupported}
            >
              🎯 Start Recording
            </button>
          ) : (
            <button onClick={stopRecording} className="btn btn-stop">
              ⏹️ Stop Recording
            </button>
          )}

          {!isRecording && dataPoints > 0 && (
            <button onClick={downloadCSV} className="btn btn-download">
              📥 Download CSV
            </button>
          )}
        </div>

        <div className="info-card">
          <h3>Instructions</h3>
          <ol>
            <li>Grant location and motion permissions</li>
            <li>Press "Start Recording" and begin walking</li>
            <li>Data syncs to server every 5 seconds</li>
            <li>Walk for 30-40 minutes to get 1000+ points</li>
            <li>Press "Stop Recording" when done</li>
            <li>Download your CSV file</li>
          </ol>
        </div>

        <div className="warning-card">
          <p>⚠️ Keep this browser tab open while recording!</p>
          <p>📱 Keep your phone's screen on to prevent sensor pausing</p>
          <p>📶 Data is buffered locally if connection drops - it will sync when back online</p>
        </div>
      </div>
    </div>
  );
}

export default App;