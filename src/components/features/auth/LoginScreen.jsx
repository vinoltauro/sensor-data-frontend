import React from 'react';
import { useAuth } from '../../../hooks/useAuth';

export const LoginScreen = () => {
  const { signIn } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      alert('Sign in failed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-lg">
        <div className="text-6xl mb-5">🍃</div>
        <h1 className="text-gray-800 text-3xl font-bold mb-2">BreathEasy Dublin</h1>
        <p className="text-gray-600 mb-8 text-base">
          Urban Air Quality & Activity Tracker
        </p>

        <div className="bg-gray-50 rounded-xl p-5 mb-8 text-left">
          <h3 className="mt-0 mb-3 text-gray-800 font-semibold">Features:</h3>
          <ul className="text-gray-600 leading-relaxed space-y-2">
            <li className="flex items-start gap-2">
              <span>🏃</span>
              <span>Real-time activity tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🌫️</span>
              <span>Live air quality monitoring</span>
            </li>
            <li className="flex items-start gap-2">
              <span>💚</span>
              <span>Personalized health recommendations</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🚴</span>
              <span>Dublin Bikes integration</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🚊</span>
              <span>Luas real-time arrivals</span>
            </li>
            <li className="flex items-start gap-2">
              <span>📊</span>
              <span>Detailed session analytics</span>
            </li>
          </ul>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="bg-primary-500 text-white border-none px-6 py-3 rounded-lg text-base font-bold cursor-pointer flex items-center gap-3 mx-auto hover:bg-primary-600 transition-all duration-200 hover:-translate-y-0.5 shadow-md"
        >
          <span className="text-xl">🔐</span>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};
