import React from 'react';
import { useSession } from '../../../hooks/useSession';
import { ActivityBadge } from '../../ui/ActivityBadge';

export const ActivityStatus = () => {
  const { isRecording, currentActivity } = useSession();

  return (
    <div className={`activity-panel ${isRecording ? 'recording-panel' : ''}`}>
      <h2 className="mt-0 mb-3 text-gray-800">Status</h2>
      <div className={`p-4 rounded-lg mb-4 ${isRecording ? 'bg-green-50' : 'bg-gray-50'}`}>
        <div className="font-bold mb-2 text-gray-800">
          {isRecording ? '🔴 Recording...' : 'Welcome back! Ready to track your activity.'}
        </div>

        {currentActivity && (
          <div className="mt-2">
            <ActivityBadge
              activity={currentActivity.activity}
              confidence={currentActivity.confidence}
            />
          </div>
        )}
      </div>
    </div>
  );
};
