export async function compressImage(file: File, maxSize = 1600, quality = 0.8): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
  
    if (width > maxSize || height > maxSize) {
      if (width >= height) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
    }
  
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, width, height);
  
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('圧縮に失敗しました'))),
        'image/jpeg',
        quality
      );
    });
  }