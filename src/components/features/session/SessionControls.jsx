import React from 'react';
import { useSession } from '../../../hooks/useSession';
import { useMap } from '../../../hooks/useMap';

export const SessionControls = () => {
  const { isRecording, startRecording, stopRecording } = useSession();
  const { currentPosition } = useMap();

  const handleStart = async () => {
    try {
      await startRecording(currentPosition);
    } catch (error) {
      alert('Failed to start recording: ' + error.message);
    }
  };

  const handleStop = async () => {
    try {
      await stopRecording();
      alert('Session saved successfully!');
    } catch (error) {
      alert('Failed to stop recording: ' + error.message);
    }
  };

  return (
    <button
      onClick={isRecording ? handleStop : handleStart}
      disabled={!currentPosition && !isRecording}
      className={`w-full px-4 py-4 rounded-xl border-none text-white text-lg font-bold cursor-pointer mb-5 transition-all duration-200 ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-green-500 hover:bg-green-600'
      } ${!currentPosition && !isRecording ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 shadow-md'}`}
    >
      {isRecording ? '⏹️ Stop Recording' : '🎯 Start Recording'}
    </button>
  );
};
