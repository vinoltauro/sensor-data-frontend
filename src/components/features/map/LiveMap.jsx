import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import { useMap } from '../../../hooks/useMap';
import { useSession } from '../../../hooks/useSession';
import { userIcon, getBikeIcon, luasGreenIcon, luasRedIcon } from '../../../utils/icons';
import { DUBLIN_CENTER } from '../../../utils/constants';
import 'leaflet/dist/leaflet.css';

export const LiveMap = () => {
  const { currentPosition, bikeStations, luasStations } = useMap();
  const { routePath, currentActivity } = useSession();

  return (
    <div className="bg-white rounded-xl p-5 mb-5 shadow-md">
      <h3 className="mt-0 mb-3 text-gray-800">🗺️ Live Route</h3>
      <div className="h-96 rounded-lg overflow-hidden">
        <MapContainer
          center={currentPosition || DUBLIN_CENTER}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* User position */}
          {currentPosition && (
            <Marker position={[currentPosition.lat, currentPosition.lng]} icon={userIcon}>
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
  );
};
