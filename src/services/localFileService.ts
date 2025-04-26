import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'audioFiles';
const FILES_STORE = 'files';
const METADATA_STORE = 'metadata';

interface LocalAudioMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

class LocalFileService {
  private db: Promise<IDBPDatabase>;

  constructor() {
    this.db = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          db.createObjectStore(FILES_STORE);
        }
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE);
        }
      },
    });
  }

  async saveFile(file: File): Promise<string> {
    const db = await this.db;
    const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store the actual file data
    await db.put(FILES_STORE, file, id);
    
    // Store metadata separately
    await db.put(METADATA_STORE, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }, id);
    
    return id;  // Return ID instead of URL
  }

  async getFile(id: string): Promise<File | null> {
    const db = await this.db;
    
    try {
      const file = await db.get(FILES_STORE, id);
      const metadata = await db.get(METADATA_STORE, id);
      
      if (!file || !metadata) return null;

      // Reconstruct File object with original metadata
      return new File([file], metadata.name, {
        type: metadata.type,
        lastModified: metadata.lastModified
      });
    } catch (error) {
      console.error('Error retrieving file:', error);
      return null;
    }
  }

  async deleteFile(id: string): Promise<void> {
    const db = await this.db;
    await Promise.all([
      db.delete(FILES_STORE, id),
      db.delete(METADATA_STORE, id)
    ]);
  }
}

export const localFileService = new LocalFileService();
