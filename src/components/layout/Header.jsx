import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSession } from '../../hooks/useSession';

export const Header = () => {
  const { user, userProfile, signOut } = useAuth();
  const { sessions } = useSession();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      alert('Sign out failed: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-5 p-4 bg-white rounded-xl shadow-md gap-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🍃</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0">BreathEasy Dublin</h1>
          <p className="text-sm text-gray-600 m-0">Urban Air Quality & Activity Tracker</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-bold text-gray-800">{user.displayName}</div>
          <div className="text-xs text-gray-600">
            Sessions: {userProfile?.totalSessions || sessions.length || 0}
          </div>
        </div>
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt="Profile"
            className="w-10 h-10 rounded-full"
          />
        )}
        <button
          onClick={handleSignOut}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
