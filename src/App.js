import React, { useState, useEffect, useRef } from 'react';
import { auth, googleProvider } from './firebaseConfig';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import 'leaflet/dist/leaflet.css';
import './App.css';

const API_URL = 'https://sensor-data-backend.onrender.com';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for different markers
const createCustomIcon = (color, symbol) => {
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

const bikeIcon = createCustomIcon('#4CAF50', '🚴');
const luasGreenIcon = createCustomIcon('#00A651', '🚊');
const luasRedIcon = createCustomIcon('#E4002B', '🚊');
const userIcon = createCustomIcon('#2196F3', '📍');

// Activity badge component
function ActivityBadge({ activity, confidence }) {
  const getActivityColor = (act) => {
    const colors = {
      standing: '#9E9E9E',
      walking: '#4CAF50',
      running: '#F44336',
      cycling: '#2196F3',
      vehicle: '#FF9800',
      unknown: '#757575'
    };
    return colors[act?.toLowerCase()] || '#757575';
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      borderRadius: '20px',
      backgroundColor: getActivityColor(activity),
      color: 'white',
      fontSize: '14px',
      fontWeight: 'bold'
    }}>
      <span>{activity || 'Unknown'}</span>
      {confidence && <span style={{ opacity: 0.9 }}>({confidence}%)</span>}
    </div>
  );
}

// AQI badge component
function AQIBadge({ aqi, category }) {
  const getAQIColor = (cat) => {
    const colors = {
      'Good': '#00E400',
      'Moderate': '#FFFF00',
      'Unhealthy for Sensitive Groups': '#FF7E00',
      'Unhealthy': '#FF0000',
      'Very Unhealthy': '#8F3F97',
      'Hazardous': '#7E0023'
    };
    return colors[cat] || '#9E9E9E';
  };

  const getEmoji = (cat) => {
    if (cat === 'Good') return '😊';
    if (cat === 'Moderate') return '😐';
    if (cat?.includes('Unhealthy for Sensitive')) return '😷';
    if (cat === 'Unhealthy') return '😨';
    if (cat === 'Very Unhealthy') return '🤢';
    if (cat === 'Hazardous') return '☠️';
    return '❓';
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: '20px',
      backgroundColor: getAQIColor(category),
      color: category === 'Moderate' ? '#000' : '#FFF',
      fontSize: '14px',
      fontWeight: 'bold'
    }}>
      <span>{getEmoji(category)}</span>
      <span>AQI: {aqi}</span>
      <span>({category})</span>
    </div>
  );
}

// Health Score Badge
function HealthScoreBadge({ score, rating }) {
  if (!score) return null;

  return (
    <div style={{
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: score >= 7 ? '#E8F5E9' : score >= 5 ? '#FFF3E0' : '#FFEBEE',
      border: `2px solid ${score >= 7 ? '#4CAF50' : score >= 5 ? '#FF9800' : '#F44336'}`,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
        Health Score
      </div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
        {score}/10
      </div>
      <div style={{ fontSize: '18px', marginTop: '4px' }}>
        {rating?.emoji} {rating?.label}
      </div>
    </div>
  );
}

// Recenter map component
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Detailed Session View Modal
function SessionDetailModal({ session, onClose }) {
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session && session.id) {
      fetchSessionDetails(session.id);
    }
  }, [session]);

  const fetchSessionDetails = async (sessionId) => {
    try {
      const authToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setSessionData(result.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching session details:', error);
      setLoading(false);
    }
  };

  if (!session) return null;

  // Prepare chart data
  const prepareSpeedData = () => {
    if (!sessionData || !sessionData.dataPoints) return [];

    return sessionData.dataPoints
      .filter((d, i) => i % 5 === 0) // Sample every 5th point
      .map((point, index) => ({
        time: index,
        speed: (point.speed || 0).toFixed(2),
        activity: point.activity
      }));
  };

  const prepareAQIData = () => {
    if (!sessionData || !sessionData.dataPoints) return [];

    return sessionData.dataPoints
      .filter((d, i) => d.airQuality && i % 5 === 0)
      .map((point, index) => ({
        time: index,
        aqi: point.airQuality?.aqi?.overall || 0
      }));
  };

  const prepareActivityPieData = () => {
    if (!session.activities) return [];

    return Object.entries(session.activities)
      .filter(([activity]) => activity !== 'unknown')
      .map(([activity, data]) => ({
        name: activity.charAt(0).toUpperCase() + activity.slice(1),
        value: parseFloat(data.percentage),
        duration: data.durationMinutes
      }));
  };

  const COLORS = {
    'Standing': '#9E9E9E',
    'Walking': '#4CAF50',
    'Running': '#F44336',
    'Cycling': '#2196F3',
    'Vehicle': '#FF9800'
  };

  const speedData = prepareSpeedData();
  const aqiData = prepareAQIData();
  const activityPieData = prepareActivityPieData();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: '2px solid #e0e0e0',
          paddingBottom: '16px'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#333' }}>
              Session Details
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
              {new Date(session.startTime?.toDate?.() || session.startTime).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕ Close
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Loading session data...
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <StatCard icon="📏" label="Distance" value={`${session.totalDistance?.toFixed(2) || 0} km`} />
              <StatCard icon="👣" label="Steps" value={session.steps?.toLocaleString() || 0} />
              <StatCard icon="⏱️" label="Duration" value={`${Math.floor((session.totalDuration || 0) / 60)}m ${(session.totalDuration || 0) % 60}s`} />
              <StatCard icon="🏃" label="Pace" value={session.pace?.display || 'N/A'} />
              <StatCard icon="🔥" label="Calories" value={session.calories || 0} />
              <StatCard icon="🎯" label="Primary" value={session.primaryActivity || 'Unknown'} />
            </div>

            {/* Health Score */}
            {session.healthScore && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px', color: '#333' }}>💚 Health Score</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr',
                  gap: '16px'
                }}>
                  <HealthScoreBadge
                    score={session.healthScore.totalScore}
                    rating={session.healthScore.rating}
                  />
                  <div>
                    {session.healthScore.insights?.map((insight, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        marginBottom: '8px',
                        borderRadius: '8px',
                        backgroundColor: insight.type === 'positive' ? '#E8F5E9' :
                          insight.type === 'warning' ? '#FFF3E0' : '#E3F2FD',
                        fontSize: '14px'
                      }}>
                        <span>{insight.icon}</span> {insight.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Charts */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '12px', color: '#333' }}>📊 Activity Breakdown</h3>
              {activityPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={activityPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                    >
                      {activityPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#999'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: '#999', textAlign: 'center' }}>No activity data available</p>
              )}
            </div>

            {speedData.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px', color: '#333' }}>📈 Speed Over Time</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={speedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Speed (m/s)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="speed" stroke="#2196F3" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {aqiData.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px', color: '#333' }}>🌫️ Air Quality Exposure</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={aqiData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'AQI', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="aqi" stroke="#FF9800" fill="#FFE0B2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: '#f5f5f5',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{value}</div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [dataBuffer, setDataBuffer] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [airQuality, setAirQuality] = useState(null);
  const [healthRecommendation, setHealthRecommendation] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [bikeStations, setBikeStations] = useState([]);
  const [luasStations, setLuasStations] = useState([]);
  const [dataPointsCount, setDataPointsCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedSession, setSelectedSession] = useState(null);

  const watchIdRef = useRef(null);
  const motionHandlerRef = useRef(null);
  const startTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const accelRef = useRef({ x: 0, y: 0, z: 0 }); // Store current accelerometer values

  // Authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const token = await currentUser.getIdToken();
          setAuthToken(token);

          // Login to backend
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          const result = await response.json();
          if (result.success) {
            setUserProfile(result.user);
            loadSessions(token);
          }
        } catch (error) {
          console.error('Backend login error:', error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setAuthToken(null);
      }
    });

    return () => unsubscribe();
  }, []);


  // Get initial GPS position when user logs in
  useEffect(() => {
    if (!user) return;

    console.log('🎯 Getting initial GPS position...');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('✅ GPS position acquired:', pos);
          setCurrentPosition(pos);
        },
        (error) => {
          console.error('❌ GPS error:', error.message);
          // Set default Dublin position if GPS fails
          const defaultPos = { lat: 53.3498, lng: -6.2603 };
          console.log('⚠️ Using default Dublin position');
          setCurrentPosition(defaultPos);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      console.error('❌ Geolocation not supported');
      setCurrentPosition({ lat: 53.3498, lng: -6.2603 });
    }
  }, [user]);

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

  // Fetch Dublin Bikes
  useEffect(() => {
    if (!authToken) return;

    const fetchBikes = async () => {
      try {
        const response = await fetch(`${API_URL}/api/firestore/dublin-bikes?limit=200`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();

        if (result.success && result.data) {
          const stationMap = new Map();
          result.data.forEach(station => {
            if (!stationMap.has(station.station_number) ||
              station.fetched_at > stationMap.get(station.station_number).fetched_at) {
              stationMap.set(station.station_number, station);
            }
          });
          setBikeStations(Array.from(stationMap.values()));
        }
      } catch (error) {
        console.error('Error fetching bikes:', error);
      }
    };

    fetchBikes();
    const interval = setInterval(fetchBikes, 120000); // Every 2 min
    return () => clearInterval(interval);
  }, [authToken]);

  // Fetch Luas stations
  useEffect(() => {
    if (!authToken) return;

    const fetchLuas = async () => {
      try {
        const response = await fetch(`${API_URL}/api/luas/realtime`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();

        if (result.success && result.stations) {
          setLuasStations(result.stations);
        }
      } catch (error) {
        console.error('Error fetching Luas:', error);
      }
    };

    fetchLuas();
    const interval = setInterval(fetchLuas, 120000); // Every 2 min
    return () => clearInterval(interval);
  }, [authToken]);

  // Load user sessions
  const loadSessions = async (token) => {
    try {
      const response = await fetch(`${API_URL}/api/sessions?limit=20`, {
        headers: { 'Authorization': `Bearer ${token || authToken}` }
      });
      const result = await response.json();
      if (result.success) {
        setSessions(result.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // Sign in with Google
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Sign in failed: ' + error.message);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setSessions([]);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Create session
      const response = await fetch(`${API_URL}/api/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          startLocation: currentPosition
        })
      });

      const result = await response.json();
      if (result.success) {
        setSessionId(result.sessionId);
        setIsRecording(true);
        setDataBuffer([]);
        setRoutePath([]);
        setDataPointsCount(0);
        setDuration(0);
        startTimeRef.current = Date.now();

        // Start duration counter
        durationIntervalRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);

        // Start GPS tracking - THIS DRIVES DATA COLLECTION
        if (navigator.geolocation) {
          console.log('🎯 Starting GPS-driven data collection');
          watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
              const newPos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };

              // Update position and route
              setCurrentPosition(newPos);
              setRoutePath(prev => [...prev, [newPos.lat, newPos.lng]]);

              // Create data point with CURRENT accelerometer values
              const dataPoint = {
                timestamp: Date.now(),
                latitude: newPos.lat,
                longitude: newPos.lng,
                accel_x: accelRef.current.x,
                accel_y: accelRef.current.y,
                accel_z: accelRef.current.z,
                accel_magnitude: Math.sqrt(
                  accelRef.current.x ** 2 + 
                  accelRef.current.y ** 2 + 
                  accelRef.current.z ** 2
                ),
                speed: position.coords.speed || 0
              };

              // Buffer and sync data
              setDataBuffer(prev => {
                const newBuffer = [...prev, dataPoint];

                // Sync every 8 points (~8 seconds at 1 point/sec)
                if (newBuffer.length >= 8) {
                  console.log(`🔄 Syncing ${newBuffer.length} data points to backend`);
                  syncDataToBackend(newBuffer);
                  return [];
                }

                return newBuffer;
              });
            },
            (error) => {
              console.error('❌ GPS error:', error);
              alert('GPS error: ' + error.message);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
          );
        }
      }
    } catch (error) {
      console.error('Start recording error:', error);
      alert('Failed to start recording: ' + error.message);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      // Stop GPS
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // Stop accelerometer
      if (motionHandlerRef.current) {
        window.removeEventListener('devicemotion', motionHandlerRef.current);
        motionHandlerRef.current = null;
      }

      // Stop duration counter
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Send any remaining buffered data
      if (dataBuffer.length > 0) {
        await syncDataToBackend(dataBuffer);
      }

      // Stop session
      const response = await fetch(`${API_URL}/api/session/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        setIsRecording(false);
        setSessionId(null);
        setDataBuffer([]);
        setCurrentActivity(null);
        setDuration(0);

        // Reload sessions
        await loadSessions(authToken);

        alert('Session saved successfully!');
      }
    } catch (error) {
      console.error('Stop recording error:', error);
      alert('Failed to stop recording: ' + error.message);
    }
  };

  // Handle GPS position update
  const handlePositionUpdate = (position) => {
    const newPos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    setCurrentPosition(newPos);
    setRoutePath(prev => [...prev, [newPos.lat, newPos.lng]]);
  };

  // Handle accelerometer data
  const handleMotionEvent = (event) => {
    if (!isRecording || !currentPosition) return;

    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null) return;

    const dataPoint = {
      timestamp: Date.now(),
      latitude: currentPosition.lat,
      longitude: currentPosition.lng,
      accel_x: acc.x,
      accel_y: acc.y,
      accel_z: acc.z,
      accel_magnitude: Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2),
      speed: 0 // Will be calculated by backend
    };

    setDataBuffer(prev => {
      const newBuffer = [...prev, dataPoint];

      // Sync every 5 seconds (~8-9 points at 1.72 Hz)
      if (newBuffer.length >= 8) {
        syncDataToBackend(newBuffer);
        return [];
      }

      return newBuffer;
    });
  };

  // Sync data to backend
  const syncDataToBackend = async (data) => {
    if (!data || data.length === 0) return;

    try {
      const response = await fetch(`${API_URL}/api/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          sessionId: sessionId,
          sensorData: data
        })
      });

      const result = await response.json();
      if (result.success && result.classifiedData) {
        // Update activity from latest point
        const latest = result.classifiedData[result.classifiedData.length - 1];
        if (latest.activity) {
          setCurrentActivity({
            activity: latest.activity,
            confidence: latest.activity_confidence
          });
        }

        setDataPointsCount(prev => prev + result.classifiedData.length);

        // Check air quality every 20 points
        if (dataPointsCount % 20 === 0 && currentPosition) {
          checkAirQuality(currentPosition.lat, currentPosition.lng);
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  // Check air quality
  const checkAirQuality = async (lat, lng) => {
    try {
      const response = await fetch(
        `${API_URL}/api/air-quality/current?lat=${lat}&lng=${lng}`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );
      const result = await response.json();

      if (result.success && result.data) {
        setAirQuality(result.data);

        // Get health recommendation
        const activity = currentActivity?.activity || 'walking';
        const recResponse = await fetch(
          `${API_URL}/api/recommendations?lat=${lat}&lng=${lng}&activity=${activity}`,
          {
            headers: { 'Authorization': `Bearer ${authToken}` }
          }
        );
        const recResult = await recResponse.json();

        if (recResult.success) {
          setHealthRecommendation(recResult.recommendation);
        }
      }
    } catch (error) {
      console.error('Air quality check error:', error);
    }
  };

  // Get bike icon based on availability
  const getBikeIcon = (station) => {
    const available = station.available_bikes || 0;
    if (available === 0) return createCustomIcon('#F44336', '🚴'); // Red - no bikes
    if (available < 5) return createCustomIcon('#FF9800', '🚴'); // Orange - few bikes
    return bikeIcon; // Green - bikes available
  };

  if (!user) {
    return (
      <div className="App" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🍃</div>
          <h1 style={{ color: '#333', marginBottom: '10px' }}>BreathEasy Dublin</h1>
          <p style={{ color: '#666', marginBottom: '30px', fontSize: '16px' }}>
            Urban Air Quality & Activity Tracker
          </p>

          <div style={{
            backgroundColor: '#f5f5f5',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
            textAlign: 'left'
          }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Features:</h3>
            <ul style={{ color: '#666', lineHeight: '1.8' }}>
              <li>🏃 Real-time activity tracking</li>
              <li>🌫️ Live air quality monitoring</li>
              <li>💚 Personalized health recommendations</li>
              <li>🚴 Dublin Bikes integration</li>
              <li>🚊 Luas real-time arrivals</li>
              <li>📊 Detailed session analytics</li>
            </ul>
          </div>

          <button
            onClick={handleGoogleSignIn}
            style={{
              backgroundColor: '#4285F4',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '0 auto',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '20px' }}>🔐</span>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>🍃</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>BreathEasy Dublin</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Urban Air Quality & Activity Tracker</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', color: '#333' }}>{user.displayName}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Sessions: {userProfile?.totalSessions || 0}
            </div>
          </div>
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt="Profile"
              style={{ width: '40px', height: '40px', borderRadius: '50%' }}
            />
          )}
          <button
            onClick={handleSignOut}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Status Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#333' }}>Status</h2>

        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: isRecording ? '#E8F5E9' : '#f5f5f5',
          marginBottom: '16px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            {isRecording ? '🔴 Recording started...' : 'Welcome back! Ready to track your activity.'}
          </div>

          {currentActivity && (
            <div style={{ marginTop: '8px' }}>
              <ActivityBadge
                activity={currentActivity.activity}
                confidence={currentActivity.confidence}
              />
            </div>
          )}
        </div>

        {airQuality && (
          <div style={{ marginBottom: '16px' }}>
            <AQIBadge
              aqi={airQuality.aqi.overall}
              category={airQuality.aqi.category}
            />
          </div>
        )}
      </div>

      {/* Health Recommendation */}
      {healthRecommendation && (
        <div style={{
          backgroundColor: healthRecommendation.safeToExercise ? '#E8F5E9' : '#FFF3E0',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          border: `2px solid ${healthRecommendation.safeToExercise ? '#4CAF50' : '#FF9800'}`
        }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>
            💚 Health Recommendation
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
            {healthRecommendation.nearestStation && (
              <li>Nearest air quality station: {healthRecommendation.nearestStation} ({healthRecommendation.distance?.toFixed(1)} km away)</li>
            )}
            {healthRecommendation.primaryPollutant && (
              <li>Primary pollutant: {healthRecommendation.primaryPollutant}</li>
            )}
          </ul>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>DATA POINTS</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196F3' }}>
            {dataPointsCount}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>DURATION</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
            {Math.floor(duration / 60)}m {duration % 60}s
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>TOTAL SESSIONS</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF9800' }}>
            {userProfile?.totalSessions || 0}
          </div>
        </div>
      </div>

      {/* Recording Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!currentPosition && !isRecording}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: isRecording ? '#F44336' : '#4CAF50',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: (!currentPosition && !isRecording) ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
          opacity: (!currentPosition && !isRecording) ? 0.5 : 1
        }}
      >
        {isRecording ? '⏹️ Stop Recording' : '🎯 Start Recording'}
      </button>

      {/* Map */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>🗺️ Live Route</h3>
        <div style={{ height: '400px', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer
            center={currentPosition || [53.3498, -6.2603]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {currentPosition && <RecenterMap center={currentPosition} />}

            {/* User position */}
            {currentPosition && (
              <Marker position={currentPosition} icon={userIcon}>
                <Popup>
                  <strong>Your Location</strong><br />
                  {currentActivity && (
                    <>
                      Activity: {currentActivity.activity}<br />
                      Confidence: {currentActivity.confidence}%
                    </>
                  )}
                </Popup>
              </Marker>
            )}

            {/* Route path */}
            {routePath.length > 1 && (
              <Polyline positions={routePath} color="#2196F3" weight={4} />
            )}

            {/* Dublin Bikes stations */}
            {bikeStations.map((station) => (
              station.position && (
                <Marker
                  key={station.station_number}
                  position={[station.position.lat, station.position.lng]}
                  icon={getBikeIcon(station)}
                >
                  <Popup>
                    <strong>{station.station_name}</strong><br />
                    🚴 {station.available_bikes || 0} bikes<br />
                    🅿️ {station.available_bike_stands || 0} stands<br />
                    <small>Updated: {new Date(station.fetched_at).toLocaleTimeString()}</small>
                  </Popup>
                </Marker>
              )
            ))}

            {/* Luas stations */}
            {luasStations.map((station) => (
              <Marker
                key={station.station_code}
                position={[station.position.lat, station.position.lng]}
                icon={station.line === 'green' ? luasGreenIcon : luasRedIcon}
              >
                <Popup>
                  <strong>{station.station_name}</strong><br />
                  <span style={{
                    backgroundColor: station.line === 'green' ? '#00A651' : '#E4002B',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {station.line.toUpperCase()} LINE
                  </span>
                  <br /><br />
                  <strong>Inbound:</strong> {station.inbound?.destination}<br />
                  Next: {station.inbound?.minutes?.join(', ') || 'N/A'} min<br />
                  <strong>Outbound:</strong> {station.outbound?.destination}<br />
                  Next: {station.outbound?.minutes?.join(', ') || 'N/A'} min
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Session History */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: 0, color: '#333' }}>📊 Session History</h3>
        </div>

        {sessions.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
            No sessions yet. Start recording to create your first session!
          </p>
        ) : (
          <div>
            {Array.isArray(sessions) && sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: '#f5f5f5',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div>
                    <strong style={{ color: '#333' }}>
                      {new Date(session.startTime?.toDate?.() || session.startTime).toLocaleDateString()}
                    </strong>
                    <span style={{ color: '#666', marginLeft: '8px', fontSize: '14px' }}>
                      {new Date(session.startTime?.toDate?.() || session.startTime).toLocaleTimeString()}
                    </span>
                  </div>
                  <ActivityBadge activity={session.primaryActivity} />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '12px',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  <div>
                    📏 Distance: <strong>{session.totalDistance?.toFixed(2) || 0} km</strong>
                  </div>
                  <div>
                    👣 Steps: <strong>{session.steps?.toLocaleString() || 0}</strong>
                  </div>
                  <div>
                    ⏱️ Duration: <strong>{Math.floor((session.totalDuration || 0) / 60)}m</strong>
                  </div>
                  {session.healthScore && (
                    <div>
                      💚 Score: <strong>{session.healthScore.totalScore}/10</strong> {session.healthScore.rating?.emoji}
                    </div>
                  )}
                </div>

                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#2196F3',
                  textAlign: 'right'
                }}>
                  Click to view details →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

export default App;