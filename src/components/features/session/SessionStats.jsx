import React from 'react';
import { useSession } from '../../../hooks/useSession';
import { useData } from '../../../hooks/useData';
import { useAuth } from '../../../hooks/useAuth';
import { StatsCard } from '../../layout/StatsCard';
import { formatDuration } from '../../../utils/formatters';

export const SessionStats = () => {
  const { duration, sessions, isRecording } = useSession();
  const { localDataPoints } = useData();
  const { userProfile } = useAuth();

  return (
    <div>
      <h3 className="mb-3 text-gray-800">📈 Current Session Stats</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <StatsCard
          icon="📊"
          label="DATA POINTS"
          value={localDataPoints}
          highlighted={isRecording && localDataPoints > 0}
        />
        <StatsCard
          icon="⏱️"
          label="DURATION"
          value={formatDuration(duration)}
          highlighted={isRecording && duration > 0}
        />
        <StatsCard
          icon="📈"
          label="TOTAL SESSIONS"
          value={userProfile?.totalSessions || sessions.length || 0}
        />
      </div>
    </div>
  );
};
