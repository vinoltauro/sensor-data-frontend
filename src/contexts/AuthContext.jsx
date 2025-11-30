import React, { createContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { authAPI } from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const token = await currentUser.getIdToken();
          setAuthToken(token);

          // Login to backend
          const result = await authAPI.login(token);

          if (result.success) {
            setUserProfile(result.user);
          }
        } catch (error) {
          console.error('Backend login error:', error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setAuthToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in with Google
  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  // Sign out
  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    authToken,
    loading,
    signIn,
    signOut: signOutUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
