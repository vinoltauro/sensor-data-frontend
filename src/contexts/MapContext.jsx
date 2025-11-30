import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { dublinBikesAPI, luasAPI } from '../utils/api';
import { DUBLIN_CENTER } from '../utils/constants';

export const MapContext = createContext();

export const MapProvider = ({ children }) => {
  const { authToken, user } = useContext(AuthContext);

  const [currentPosition, setCurrentPosition] = useState(null);
  const [bikeStations, setBikeStations] = useState([]);
  const [luasStations, setLuasStations] = useState([]);

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
          console.log('⚠️ Using default Dublin position');
          setCurrentPosition(DUBLIN_CENTER);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      console.error('❌ Geolocation not supported');
      setCurrentPosition(DUBLIN_CENTER);
    }
  }, [user]);

  // Fetch Dublin Bikes
  useEffect(() => {
    if (!authToken) return;

    const fetchBikes = async () => {
      try {
        const result = await dublinBikesAPI.getStations(authToken);

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
        const result = await luasAPI.getRealtime(authToken);

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

  const value = {
    currentPosition,
    setCurrentPosition,
    bikeStations,
    luasStations
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
};
