import React from 'react';
import { useSession } from '../../../hooks/useSession';
import { ActivityBadge } from '../../ui/ActivityBadge';

export const ActivityStatus = () => {
  const { isRecording, currentActivity } = useSession();

  return (
    <div className="bg-white rounded-xl p-5 mb-5 shadow-md">
      <h2 className="mt-0 mb-3 text-gray-800">📊 Status</h2>
      <div className={`p-4 rounded-lg ${isRecording ? 'bg-green-50' : 'bg-gray-50'}`}>
        <div className="font-bold mb-2 text-gray-800">
          {isRecording ? '🔴 Recording in progress...' : '👋 Welcome back! Ready to track your activity.'}
        </div>

        {isRecording && !currentActivity && (
          <div className="text-sm text-gray-600 mt-2">
            Collecting data... Activity will be detected shortly.
          </div>
        )}

        {currentActivity && (
          <div className="mt-2">
            <ActivityBadge
              activity={currentActivity.activity}
              confidence={currentActivity.confidence}
            />
          </div>
        )}

        {!isRecording && (
          <div className="text-sm text-gray-600 mt-2">
            💡 Click "Start Recording" below to begin tracking your activity, air quality, and location.
          </div>
        )}
      </div>
    </div>
  );
};
