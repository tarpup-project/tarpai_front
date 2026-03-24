import { compressImageToTarget, formatFileSize } from './imageCompression';

/**
 * Test function to verify image compression works correctly
 * This can be called from the browser console for testing
 */
export const testImageCompression = async () => {
  console.log('🧪 Testing Image Compression Utility...');
  
  // Create a test canvas with a large image
  const canvas = document.createElement('canvas');
  canvas.width = 3000;
  canvas.height = 2000;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('❌ Failed to get canvas context');
    return;
  }
  
  // Draw a test pattern
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#4ecdc4';
  for (let i = 0; i < 100; i++) {
    ctx.fillRect(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      100,
      100
    );
  }
  
  // Convert to blob and then to file
  return new Promise<void>((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('❌ Failed to create test image blob');
        resolve();
        return;
      }
      
      const originalFile = new File([blob], 'test-image.jpg', { type: 'image/jpeg' });
      const originalSize = originalFile.size;
      
      console.log(`📊 Original file size: ${formatFileSize(originalSize)}`);
      
      try {
        // Test compression to 1MB
        console.log('🔄 Compressing to 1MB...');
        const compressed1MB = await compressImageToTarget(originalFile, 1024);
        const compressed1MBSize = compressed1MB.size;
        
        console.log(`📊 Compressed to 1MB: ${formatFileSize(compressed1MBSize)}`);
        console.log(`📈 Compression ratio: ${((originalSize - compressed1MBSize) / originalSize * 100).toFixed(1)}%`);
        
        // Test compression to 500KB
        console.log('🔄 Compressing to 500KB...');
        const compressed500KB = await compressImageToTarget(originalFile, 512);
        const compressed500KBSize = compressed500KB.size;
        
        console.log(`📊 Compressed to 500KB: ${formatFileSize(compressed500KBSize)}`);
        console.log(`📈 Compression ratio: ${((originalSize - compressed500KBSize) / originalSize * 100).toFixed(1)}%`);
        
        // Test with already small file
        console.log('🔄 Testing with small file...');
        const smallCompressed = await compressImageToTarget(compressed500KB, 1024);
        
        if (smallCompressed.size === compressed500KB.size) {
          console.log('✅ Small file handling: Correctly returned original file');
        } else {
          console.log('⚠️ Small file handling: File was modified unnecessarily');
        }
        
        console.log('✅ Image compression tests completed successfully!');
        
      } catch (error) {
        console.error('❌ Compression test failed:', error);
      }
      
      resolve();
    }, 'image/jpeg', 0.9);
  });
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testImageCompression = testImageCompression;
}