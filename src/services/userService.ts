import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { Track } from '../types/playlist.ts';

export const userService = {
  async initializeUserDocument(userId: string) {
    const userRef = doc(db, `users/${userId}`);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create new user document with empty arrays
      await setDoc(userRef, {
        favorites: [],
        queue: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    } else {
      // Ensure arrays exist in existing document
      const data = userDoc.data();
      const updates: any = {};
      
      if (!Array.isArray(data.favorites)) {
        updates.favorites = [];
      }
      if (!Array.isArray(data.queue)) {
        updates.queue = [];
      }
      
      if (Object.keys(updates).length > 0) {
        await setDoc(userRef, updates, { merge: true });
      }
    }
  },

  async syncQueue(userId: string, queue: Track[]) {
    const userRef = doc(db, `users/${userId}`);
    
    try {
      await updateDoc(userRef, {
        queue: queue.map(track => track.id), // Store only track IDs
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error syncing queue:', error);
      throw error;
    }
  },

  async getQueue(userId: string): Promise<string[]> {
    const userRef = doc(db, `users/${userId}`);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return Array.isArray(data.queue) ? data.queue : [];
    }
    return [];
  }
};
