import { Track } from '../types/playlist';

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

interface FileMetadata {
  name: string;
  type: string;
  size: number;
  chunks: number;
  lastAccessed: number;
}

export const initDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('audioFiles', 2); // Increased version for schema update

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store for file chunks
      if (!db.objectStoreNames.contains('chunks')) {
        db.createObjectStore('chunks');
      }
      
      // Store for file metadata
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata');
      }
    };
  });
};

export const storeFile = async (fileId: string, file: File): Promise<void> => {
  const db = await initDB() as IDBDatabase;
  const chunks: Blob[] = [];
  let offset = 0;

  // Split file into chunks
  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + CHUNK_SIZE));
    offset += CHUNK_SIZE;
  }

  // Store chunks
  const chunkPromises = chunks.map((chunk, index) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      const request = store.put(chunk, `${fileId}_${index}`);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  });

  // Store metadata
  const metadata: FileMetadata = {
    name: file.name,
    type: file.type,
    size: file.size,
    chunks: chunks.length,
    lastAccessed: Date.now()
  };

  const metadataPromise = new Promise((resolve, reject) => {
    const transaction = db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');
    const request = store.put(metadata, fileId);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });

  await Promise.all([...chunkPromises, metadataPromise]);
};

export const getFile = async (fileId: string): Promise<Blob> => {
  const db = await initDB() as IDBDatabase;
  
  // Get metadata with type assertion
  const metadata = await new Promise<FileMetadata>((resolve, reject) => {
    const transaction = db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');
    const request = store.get(fileId);
    request.onsuccess = () => resolve(request.result as FileMetadata);
    request.onerror = () => reject(request.error);
  });

  // Get all chunks with proper typing
  const chunkPromises = Array.from({ length: metadata.chunks }, (_, i) =>
    new Promise<Blob>((resolve, reject) => {
      const transaction = db.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const request = store.get(`${fileId}_${i}`);
      request.onsuccess = () => resolve(request.result as Blob);
      request.onerror = () => reject(request.error);
    })
  );

  const chunks = await Promise.all(chunkPromises);
  return new Blob(chunks, { type: metadata.type });
};

export const deleteFile = async (fileId: string): Promise<void> => {
  const db = await initDB() as IDBDatabase;
  
  // Get metadata with type assertion
  const metadata = await new Promise<FileMetadata>((resolve, reject) => {
    const transaction = db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');
    const request = store.get(fileId);
    request.onsuccess = () => resolve(request.result as FileMetadata);
    request.onerror = () => reject(request.error);
  });

  // Delete chunks
  const chunkPromises = Array.from({ length: metadata.chunks }, (_, i) =>
    new Promise((resolve, reject) => {
      const transaction = db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      const request = store.delete(`${fileId}_${i}`);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    })
  );

  // Delete metadata
  const metadataPromise = new Promise((resolve, reject) => {
    const transaction = db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');
    const request = store.delete(fileId);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });

  await Promise.all([...chunkPromises, metadataPromise]);
};
