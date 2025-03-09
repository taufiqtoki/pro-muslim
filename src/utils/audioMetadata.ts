export interface LocalAudioMetadata {
  name: string;
  duration: number;
  fileUrl: string;
  lastModified: number;
  size: number;
}

export const getAudioMetadata = async (file: File): Promise<LocalAudioMetadata> => {
  const fileUrl = URL.createObjectURL(file);
  
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = fileUrl;
    
    audio.addEventListener('loadedmetadata', () => {
      resolve({
        name: file.name,
        duration: audio.duration,
        fileUrl,
        lastModified: file.lastModified,
        size: file.size
      });
    });

    audio.addEventListener('error', (error) => {
      URL.revokeObjectURL(fileUrl);
      reject(error);
    });
  });
};
