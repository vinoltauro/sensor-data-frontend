import React, { createContext, useState, useRef, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { sessionAPI } from '../utils/api';

export const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const { authToken } = useContext(AuthContext);

  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [duration, setDuration] = useState(0);
  const [routePath, setRoutePath] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  // Refs for timers
  const startTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // Load user sessions
  const loadSessions = async (token) => {
    try {
      console.log('🔄 Loading sessions...');
      const result = await sessionAPI.getSessions(token || authToken);
      console.log('📦 Sessions response:', result);

      if (result.success) {
        let sessionsArray = [];

        // Handle nested response bug: {success: true, sessions: {success: true, sessions: [...]}}
        let sessionsData = result.sessions;

        // Check if sessions is nested (backend bug)
        if (sessionsData && sessionsData.sessions && Array.isArray(sessionsData.sessions)) {
          console.log('⚠️ Detected nested sessions response - unwrapping');
          sessionsData = sessionsData.sessions;
        }

        // Now handle the actual sessions data
        if (Array.isArray(sessionsData)) {
          sessionsArray = [...sessionsData];
        } else if (sessionsData && typeof sessionsData === 'object') {
          // Fallback: convert object to array
          sessionsArray = Object.values(sessionsData);
          console.log('⚠️ Converted object to array');
        }

        console.log('📊 Session count:', sessionsArray.length);
        console.log('✅ Setting sessions:', sessionsArray.length, 'sessions');
        setSessions(sessionsArray);
        console.log('✅ Sessions state updated!');
      }
    } catch (error) {
      console.error('❌ Error loading sessions:', error);
    }
  };

  // Start recording
  const startRecording = async (currentPosition) => {
    try {
      // Create session
      const result = await sessionAPI.start(authToken, currentPosition);

      if (result.success) {
        setSessionId(result.sessionId);
        setIsRecording(true);
        setRoutePath([]);
        setDuration(0);
        startTimeRef.current = Date.now();

        // Start duration counter
        durationIntervalRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);

        return { success: true };
      }
    } catch (error) {
      console.error('Start recording error:', error);
      throw error;
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      // Stop duration counter
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Stop session
      await sessionAPI.stop(authToken, sessionId);

      setIsRecording(false);
      setSessionId(null);
      setCurrentActivity(null);
      setDuration(0);

      // Reload sessions
      await loadSessions(authToken);

      return { success: true };
    } catch (error) {
      console.error('Stop recording error:', error);
      throw error;
    }
  };

  // Update route path
  const addToRoutePath = (position) => {
    setRoutePath(prev => [...prev, [position.lat, position.lng]]);
  };

  const value = {
    isRecording,
    sessionId,
    currentActivity,
    setCurrentActivity,
    duration,
    routePath,
    addToRoutePath,
    sessions,
    selectedSession,
    setSelectedSession,
    startRecording,
    stopRecording,
    loadSessions
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};
