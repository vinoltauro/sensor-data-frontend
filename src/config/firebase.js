import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';


const firebaseConfig = {
  apiKey: "AIzaSyBGvBCReccBptKJRMUla602ZkEUE3etEiY",
  authDomain: "urban-computing-f6ea7.firebaseapp.com",
  projectId: "urban-computing-f6ea7",
  storageBucket: "urban-computing-f6ea7.firebasestorage.app",
  messagingSenderId: "457995273027",
  appId: "1:457995273027:web:104442c6be213c5b8625f6",
  measurementId: "G-LV681ZXSMJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return {
      success: true,
      user: result.user,
      idToken: idToken
    };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

export default app;
