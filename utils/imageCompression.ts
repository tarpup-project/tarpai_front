/**
 * Compresses an image file to reduce its size while maintaining quality
 * @param file - The image file to compress
 * @param maxSizeKB - Maximum size in KB (default: 1024KB = 1MB)
 * @param quality - Compression quality (0.1 to 1.0, default: 0.8)
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1920)
 * @returns Promise<File> - The compressed image file
 */
export const compressImage = (
  file: File,
  maxSizeKB: number = 1024,
  quality: number = 0.8,
  maxWidth: number = 1920,
  maxHeight: number = 1920
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress the image
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        
        // Start with the specified quality
        let currentQuality = quality;
        
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              // Check if the file size is acceptable
              const fileSizeKB = compressedFile.size / 1024;
              
              if (fileSizeKB <= maxSizeKB || currentQuality <= 0.1) {
                // File is small enough or we've reached minimum quality
                resolve(compressedFile);
              } else {
                // Reduce quality and try again
                currentQuality = Math.max(0.1, currentQuality - 0.1);
                tryCompress();
              }
            },
            'image/jpeg',
            currentQuality
          );
        };

        tryCompress();
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Create object URL for the image
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Compresses an image with progressive quality reduction until it meets size requirements
 * @param file - The image file to compress
 * @param targetSizeKB - Target size in KB (will try to get as close as possible)
 * @returns Promise<File> - The compressed image file
 */
export const compressImageToTarget = async (
  file: File,
  targetSizeKB: number = 1024
): Promise<File> => {
  // If file is already small enough, return as is
  if (file.size / 1024 <= targetSizeKB) {
    return file;
  }

  // Start with high quality and progressively reduce
  const qualities = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
  
  for (const quality of qualities) {
    try {
      const compressed = await compressImage(file, targetSizeKB, quality);
      const compressedSizeKB = compressed.size / 1024;
      
      if (compressedSizeKB <= targetSizeKB) {
        return compressed;
      }
    } catch (error) {
      console.warn(`Failed to compress with quality ${quality}:`, error);
    }
  }

  // If all qualities fail, try with smaller dimensions
  try {
    return await compressImage(file, targetSizeKB, 0.1, 1280, 1280);
  } catch (error) {
    // Last resort - very small dimensions
    return await compressImage(file, targetSizeKB, 0.1, 800, 800);
  }
};

/**
 * Gets the size of a file in a human-readable format
 * @param bytes - File size in bytes
 * @returns String representation of file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};