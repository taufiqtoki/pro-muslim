import { 
  DocumentData, 
  DocumentReference, 
  Firestore, 
  QuerySnapshot, 
  Unsubscribe, 
  collection, 
  doc, 
  onSnapshot,
  query,
  where,
  DocumentSnapshot,
  Query,
  QueryDocumentSnapshot,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

// Store active listeners for cleanup
const activeListeners: { [key: string]: Unsubscribe } = {};

/**
 * Safely create a collection reference with proper error handling
 */
export const safeCollection = (path: string) => {
  try {
    return collection(db, path);
  } catch (error) {
    console.error(`Error creating collection reference for ${path}:`, error);
    throw error;
  }
};

/**
 * Safely create a document reference with proper error handling
 */
export const safeDoc = (path: string) => {
  try {
    return doc(db, path);
  } catch (error) {
    console.error(`Error creating document reference for ${path}:`, error);
    throw error;
  }
};

/**
 * Get a document with error handling and type safety
 */
export const safeGetDoc = async <T = DocumentData>(docRef: DocumentReference<T>): Promise<DocumentSnapshot<T> | null> => {
  try {
    return await getDoc(docRef);
  } catch (error) {
    console.error('Error getting document:', error);
    return null;
  }
};

/**
 * Query documents with error handling
 */
export const safeGetDocs = async <T = DocumentData>(query: Query<T>): Promise<QueryDocumentSnapshot<T>[]> => {
  try {
    const snapshot = await getDocs(query);
    return snapshot.docs;
  } catch (error) {
    console.error('Error querying documents:', error);
    return [];
  }
};

/**
 * Create a listener with automatic cleanup to prevent memory leaks and unexpected states
 * Returns a function to manually unsubscribe if needed
 */
export const createSafeListener = <T = DocumentData>(
  query: Query<T>,
  listenerKey: string,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  // Remove any existing listener with the same key
  if (activeListeners[listenerKey]) {
    activeListeners[listenerKey]();
    delete activeListeners[listenerKey];
  }

  // Create new listener with error handling
  const unsubscribe = onSnapshot(
    query,
    (snapshot) => {
      try {
        onNext(snapshot);
      } catch (error) {
        console.error(`Error in listener callback for ${listenerKey}:`, error);
        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    },
    (error) => {
      console.error(`Listener error for ${listenerKey}:`, error);
      if (onError) {
        onError(error);
      }
    }
  );

  // Store for future cleanup
  activeListeners[listenerKey] = unsubscribe;
  
  // Return unsubscribe function that also removes from activeListeners
  return () => {
    unsubscribe();
    delete activeListeners[listenerKey];
  };
};

/**
 * Unsubscribe from all active listeners - useful when signing out
 */
export const unsubscribeAllListeners = () => {
  Object.values(activeListeners).forEach(unsubscribe => {
    try {
      unsubscribe();
    } catch (error) {
      console.error('Error unsubscribing listener:', error);
    }
  });
  
  // Clear the listeners object
  Object.keys(activeListeners).forEach(key => {
    delete activeListeners[key];
  });
};

/**
 * Retry a Firestore operation with exponential backoff
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>, 
  retries = 3, 
  delay = 1000
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.log(`Retrying operation in ${delay}ms, ${retries} retries left`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return retryOperation(operation, retries - 1, delay * 2);
  }
};

// Listen for window beforeunload to clean up listeners
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    unsubscribeAllListeners();
  });
}

export default {
  safeCollection,
  safeDoc,
  safeGetDoc,
  safeGetDocs,
  createSafeListener,
  unsubscribeAllListeners,
  retryOperation
}; 