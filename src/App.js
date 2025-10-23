import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// CHANGE THIS to your deployed backend URL after deployment!
const API_URL = 'http://localhost:3001'; // Change to: https://your-app.railway.app

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [dataPoints, setDataPoints] = useState(0);
  const [localDataPoints, setLocalDataPoints] = useState(0);
  const [status, setStatus] = useState('Ready to collect data');
  const [gpsSupported, setGpsSupported] = useState(false);
  const [accelSupported, setAccelSupported] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  
  const dataBuffer = useRef([]);
  const gpsWatchId = useRef(null);
  const accelRef = useRef({ x: 0, y: 0, z: 0 });
  const startTime = useRef(null);

  // Check sensor support on mount
  useEffect(() => {
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
      if (dataBuffer.current.length > 0) {
        try {
          const dataToSend = [...dataBuffer.current];
          dataBuffer.current = [];

          const response = await fetch(`${API_URL}/api/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: dataToSend })
          });

          const result = await response.json();
          if (result.success) {
            setDataPoints(result.totalPoints);
            setLastSync(new Date().toLocaleTimeString());
          }
        } catch (error) {
          console.error('Sync error:', error);
          setStatus('Sync error - check backend URL');
        }
      }
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // Start new session on backend
      const response = await fetch(`${API_URL}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      setSessionId(result.sessionId);
      
      startTime.current = Date.now();
      setIsRecording(true);
      setDataPoints(0);
      setLocalDataPoints(0);
      dataBuffer.current = [];
      setStatus('Recording started...');

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
            setStatus(`Recording... ${dataBuffer.current.length} points buffered`);
          },
          (error) => {
            console.error('GPS error:', error);
            setStatus(`GPS error: ${error.message}`);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
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

    // Send any remaining data
    if (dataBuffer.current.length > 0) {
      try {
        await fetch(`${API_URL}/api/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: dataBuffer.current })
        });
      } catch (error) {
        console.error('Final sync error:', error);
      }
    }

    // Stop session
    try {
      await fetch(`${API_URL}/api/session/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Stop session error:', error);
    }

    dataBuffer.current = [];
    setStatus('Recording stopped. Ready to download.');
  };

  const downloadCSV = async () => {
    try {
      const response = await fetch(`${API_URL}/api/data/download`);
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
      setStatus('Download error - make sure data was collected');
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
        </div>
      </div>
    </div>
  );
}

export default App;
