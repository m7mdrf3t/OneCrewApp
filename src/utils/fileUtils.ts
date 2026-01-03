/**
 * Get MIME type from file extension
 * Handles common image formats including HEIC/HEIF
 */
export function getMimeTypeFromFileName(fileName: string): string {
  if (!fileName) {
    return 'image/jpeg'; // Default fallback
  }

  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: { [key: string]: string } = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'heif': 'image/heif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    // Videos
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return mimeTypes[extension] || 'image/jpeg'; // Default to JPEG if unknown
}

/**
 * Check if a file is a HEIC/HEIF image
 */
export function isHeicFile(fileName: string): boolean {
  if (!fileName) {
    return false;
  }
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return extension === 'heic' || extension === 'heif';
}








