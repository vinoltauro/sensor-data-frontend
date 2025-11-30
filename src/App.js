import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SessionProvider } from './contexts/SessionContext';
import { MapProvider } from './contexts/MapContext';
import { DataProvider } from './contexts/DataContext';
import { useAuth } from './hooks/useAuth';
import { useSession } from './hooks/useSession';
import { useSessionLoader } from './hooks/useSessionLoader';
import { useRecording } from './hooks/useRecording';

import { LoginScreen } from './components/features/auth/LoginScreen';
import { Header } from './components/layout/Header';
import { Container } from './components/layout/Container';
import { ActivityStatus } from './components/features/activity/ActivityStatus';
import { AirQualityPanel } from './components/features/air-quality/AirQualityPanel';
import { HealthRecommendationPanel } from './components/features/air-quality/HealthRecommendationPanel';
import { SessionStats } from './components/features/session/SessionStats';
import { SessionControls } from './components/features/session/SessionControls';
import { SessionHistory } from './components/features/session/SessionHistory';
import { SessionDetailModal } from './components/features/session/SessionDetailModal';
import { LiveMap } from './components/features/map/LiveMap';

function AppContent() {
  const { user, loading } = useAuth();
  const { selectedSession, setSelectedSession } = useSession();

  // Load sessions when user logs in
  useSessionLoader();

  // Handle GPS tracking during recording
  useRecording();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🍃</div>
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <Container>
      <Header />
      <ActivityStatus />
      <AirQualityPanel />
      <HealthRecommendationPanel />
      <SessionStats />
      <SessionControls />
      <LiveMap />
      <SessionHistory />

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </Container>
  );
}

function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <MapProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </MapProvider>
      </SessionProvider>
    </AuthProvider>
  );
}

export default App;
