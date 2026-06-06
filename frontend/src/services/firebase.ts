import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC0mUixYOQzicVm1zJxezN3FQWGhUzPJxw",
  authDomain: "app-reformia.firebaseapp.com",
  projectId: "app-reformia",
  storageBucket: "app-reformia.firebasestorage.app",
  messagingSenderId: "21328141426",
  appId: "1:21328141426:web:049f5d77c1c7ce6b9536eb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    return null;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};
