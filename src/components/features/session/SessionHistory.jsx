import React from 'react';
import { useSession } from '../../../hooks/useSession';
import { ActivityBadge } from '../../ui/ActivityBadge';

export const SessionHistory = () => {
  const { sessions, setSelectedSession } = useSession();

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-md">
        <h3 className="mt-0 mb-4 text-gray-800">📊 Session History</h3>
        <p className="text-gray-400 text-center py-5">
          No sessions yet. Start recording to create your first session!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0 text-gray-800">📊 Session History</h3>
      </div>

      <div>
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => setSelectedSession(session)}
            className="p-4 rounded-lg bg-gray-50 mb-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex justify-between items-center mb-2">
              <div>
                <strong className="text-gray-800">
                  {session.startTime?._seconds
                    ? new Date(session.startTime._seconds * 1000).toLocaleDateString()
                    : new Date(session.startTime?.toDate?.() || session.startTime).toLocaleDateString()}
                </strong>
                <span className="text-gray-600 ml-2 text-sm">
                  {session.startTime?._seconds
                    ? new Date(session.startTime._seconds * 1000).toLocaleTimeString()
                    : new Date(session.startTime?.toDate?.() || session.startTime).toLocaleTimeString()}
                </span>
              </div>
              <ActivityBadge activity={session.primaryActivity} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
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

            <div className="mt-2 text-xs text-blue-500 text-right">
              Click to view details →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
