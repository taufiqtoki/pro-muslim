import { db } from '../firebase.ts';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Track } from '../types/playlist.ts';

export const favoritesService = {
  async getFavorites(userId: string): Promise<string[]> {
    const userDoc = await getDoc(doc(db, `users/${userId}`));
    return userDoc.exists() ? (userDoc.data().favorites || []) : [];
  },

  async addToFavorites(userId: string, trackId: string): Promise<void> {
    const userRef = doc(db, `users/${userId}`);
    await updateDoc(userRef, {
      favorites: arrayUnion(trackId)
    });
  },

  async removeFromFavorites(userId: string, trackId: string): Promise<void> {
    const userRef = doc(db, `users/${userId}`);
    await updateDoc(userRef, {
      favorites: arrayRemove(trackId)
    });
  },

  // Local storage methods for non-authenticated users
  getLocalFavorites(): string[] {
    return JSON.parse(localStorage.getItem('favorites') || '[]');
  },

  setLocalFavorites(favorites: string[]): void {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }
};
