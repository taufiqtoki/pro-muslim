import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { playlistService } from '../services/playlistService.ts';
import { userService } from '../services/userService.ts';
import { unsubscribeAllListeners } from '../utils/firestore.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => { throw new Error('AuthContext not initialized'); },
  signUp: async () => { throw new Error('AuthContext not initialized'); },
  signOut: async () => { throw new Error('AuthContext not initialized'); }
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // First unsubscribe from all Firestore listeners to prevent "Unexpected state" errors
      unsubscribeAllListeners();
      
      // Then sign out from Firebase
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Set loading to true initially
    setLoading(true);
    
    // Auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Wrap initialization in try-catch to prevent uncaught errors
          try {
            // Initialize user playlists when user logs in
            await playlistService.initializeUserPlaylists(currentUser.uid);
            
            // Initialize user document when user signs in
            await userService.initializeUserDocument(currentUser.uid);
          } catch (initError) {
            console.error('Error initializing user data:', initError);
            // Continue despite initialization errors
          }
        } else {
          // When user is null (signed out), clean up all listeners
          unsubscribeAllListeners();
        }
        
        // Always set the user, even if initialization failed
        setUser(currentUser);
      } catch (error) {
        console.error('Error in auth state change:', error);
        
        // Reset state on error
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    // Clean up function - crucial for preventing memory leaks
    return () => {
      unsubscribe();
      // Also clean up any active Firestore listeners on unmount
      unsubscribeAllListeners();
    };
  }, []);  // Empty dependency array means this effect runs once on mount

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};