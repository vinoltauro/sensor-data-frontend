import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import L from 'leaflet';
import { useAuth } from '../../../hooks/useAuth';
import { sessionAPI } from '../../../utils/api';
import { StatsCard } from '../../layout/StatsCard';
import { HealthScoreBadge } from '../../ui/HealthScoreBadge';

const COLORS = {
  'Standing': '#9E9E9E',
  'Walking': '#4CAF50',
  'Running': '#F44336',
  'Cycling': '#2196F3',
  'Vehicle': '#FF9800'
};

export const SessionDetailModal = ({ session, onClose }) => {
  const { authToken } = useAuth();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session && session.id) {
      fetchSessionDetails(session.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchSessionDetails = async (sessionId) => {
    try {
      const result = await sessionAPI.getSessionDetails(authToken, sessionId);
      if (result.success) {
        setSessionData(result.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching session details:', error);
      setLoading(false);
    }
  };

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

  const speedData = prepareSpeedData();
  const aqiData = prepareAQIData();
  const activityPieData = prepareActivityPieData();

  if (!session) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
          <div>
            <h2 className="m-0 text-gray-800">Session Details</h2>
            <p className="m-0 mt-1 text-gray-600 text-sm">
              {session.startTime?._seconds
                ? new Date(session.startTime._seconds * 1000).toLocaleString()
                : new Date(session.startTime?.toDate?.() || session.startTime).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border-none bg-gray-100 cursor-pointer text-base hover:bg-gray-200"
          >
            ✕ Close
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-600">
            Loading session data...
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <StatsCard icon="📏" label="Distance" value={`${session.totalDistance?.toFixed(2) || 0} km`} />
              <StatsCard icon="👣" label="Steps" value={session.steps?.toLocaleString() || 0} />
              <StatsCard icon="⏱️" label="Duration" value={`${Math.floor((session.totalDuration || 0) / 60)}m ${(session.totalDuration || 0) % 60}s`} />
              <StatsCard icon="🏃" label="Pace" value={session.pace?.display || 'N/A'} />
              <StatsCard icon="🔥" label="Calories" value={session.calories || 0} />
              <StatsCard icon="🎯" label="Primary" value={session.primaryActivity || 'Unknown'} />
            </div>

            {/* Health Score */}
            {session.healthScore && (
              <div className="mb-6">
                <h3 className="mb-3 text-gray-800">💚 Health Score</h3>
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                  <HealthScoreBadge
                    score={session.healthScore.totalScore}
                    rating={session.healthScore.rating}
                  />
                  <div>
                    {session.healthScore.insights?.map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-2 px-3 mb-2 rounded-lg text-sm"
                        style={{
                          backgroundColor: insight.type === 'positive' ? '#E8F5E9' :
                            insight.type === 'warning' ? '#FFF3E0' : '#E3F2FD'
                        }}
                      >
                        <span>{insight.icon}</span> {insight.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Route Map */}
            {sessionData && sessionData.dataPoints && sessionData.dataPoints.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-gray-800">🗺️ Route Map</h3>
                <div className="h-96 rounded-xl overflow-hidden border-2 border-gray-200">
                  <MapContainer
                    center={[sessionData.dataPoints[0].latitude, sessionData.dataPoints[0].longitude]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />

                    {/* Start marker */}
                    <Marker
                      position={[sessionData.dataPoints[0].latitude, sessionData.dataPoints[0].longitude]}
                      icon={L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                      })}
                    >
                      <Popup>
                        <strong>Start</strong><br />
                        {new Date(sessionData.dataPoints[0].timestamp).toLocaleTimeString()}
                      </Popup>
                    </Marker>

                    {/* End marker */}
                    {sessionData.dataPoints.length > 1 && (
                      <Marker
                        position={[
                          sessionData.dataPoints[sessionData.dataPoints.length - 1].latitude,
                          sessionData.dataPoints[sessionData.dataPoints.length - 1].longitude
                        ]}
                        icon={L.icon({
                          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                          iconSize: [25, 41],
                          iconAnchor: [12, 41],
                          popupAnchor: [1, -34],
                          shadowSize: [41, 41]
                        })}
                      >
                        <Popup>
                          <strong>End</strong><br />
                          {new Date(sessionData.dataPoints[sessionData.dataPoints.length - 1].timestamp).toLocaleTimeString()}
                        </Popup>
                      </Marker>
                    )}

                    {/* Route path */}
                    <Polyline
                      positions={sessionData.dataPoints.map(point => [point.latitude, point.longitude])}
                      color="#2196F3"
                      weight={4}
                      opacity={0.7}
                    />
                  </MapContainer>
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="mb-6">
              <h3 className="mb-3 text-gray-800">📊 Activity Breakdown</h3>
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
                <p className="text-gray-400 text-center">No activity data available</p>
              )}
            </div>

            {speedData.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-gray-800">📈 Speed Over Time</h3>
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
              <div className="mb-6">
                <h3 className="mb-3 text-gray-800">🌫️ Air Quality Exposure</h3>
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
};
