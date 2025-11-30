import React from 'react';
import { useSession } from '../../../hooks/useSession';
import { useData } from '../../../hooks/useData';
import { useAuth } from '../../../hooks/useAuth';
import { StatsCard } from '../../layout/StatsCard';
import { formatDuration } from '../../../utils/formatters';

export const SessionStats = () => {
  const { duration, sessions } = useSession();
  const { localDataPoints } = useData();
  const { userProfile } = useAuth();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
      <StatsCard
        icon="📊"
        label="DATA POINTS"
        value={localDataPoints}
      />
      <StatsCard
        icon="⏱️"
        label="DURATION"
        value={formatDuration(duration)}
      />
      <StatsCard
        icon="📈"
        label="TOTAL SESSIONS"
        value={userProfile?.totalSessions || sessions.length || 0}
      />
    </div>
  );
};
