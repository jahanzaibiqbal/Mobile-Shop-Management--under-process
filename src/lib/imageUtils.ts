/**
 * Image compression and sanitization utilities for safe Google Sheets & LocalStorage sync.
 */

/**
 * Downscale and compress an uploaded image file into a lightweight base64 JPEG thumbnail.
 * This keeps the resulting base64 string under ~8KB (approx 6,000-10,000 chars),
 * preventing Google Sheets 50,000 character-per-cell limits and LocalStorage 5MB quota errors.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 260,
  maxHeight = 260,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(result.length < 35000 ? result : '');
          return;
        }

        // Clean white background for transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(result.length < 35000 ? result : '');
        }
      };

      img.onerror = () => {
        resolve(result.length < 35000 ? result : '');
      };

      img.src = result;
    };

    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an existing base64 data URL string if it's overly large.
 */
export async function compressDataUrl(
  dataUrl: string,
  maxWidth = 260,
  maxHeight = 260,
  quality = 0.75
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl || '';
  }

  // If already small (< 15KB string length), return as-is
  if (dataUrl.length < 15000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(dataUrl.length < 35000 ? dataUrl : '');
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch {
        resolve(dataUrl.length < 35000 ? dataUrl : '');
      }
    };

    img.onerror = () => {
      resolve(dataUrl.length < 35000 ? dataUrl : '');
    };

    img.src = dataUrl;
  });
}

/**
 * Prepares image URL for Google Sheets cell writing.
 * Ensures that no cell exceeds Google Sheets 50,000 character limit,
 * which is the primary cause of Google Sheets API 400 Bad Request errors.
 */
export function sanitizeImageForSheet(imageUrl?: string): string {
  if (!imageUrl) return '';
  const trimmed = imageUrl.trim();

  // If it's a standard web URL (http:// or https://), it's safe and short
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // If it's a base64 string, check length
  if (trimmed.startsWith('data:image')) {
    // Google Sheets maximum cell character limit is 50,000.
    // We enforce a strict 35,000 char threshold for safe sync.
    if (trimmed.length <= 35000) {
      return trimmed;
    }
    // If oversized base64, omit from sheet payload to prevent breaking live-sync
    return '';
  }

  return trimmed.length <= 35000 ? trimmed : '';
}
