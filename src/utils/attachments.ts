import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { TaskAttachment } from '../types/orbit';

export const MAX_ATTACHMENTS_PER_TASK = 5;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
};

export const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.pdf',
  '.docx',
  '.xlsx',
  '.pptx',
  '.txt',
];

export const FILE_INPUT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.pdf',
  '.docx',
  '.xlsx',
  '.pptx',
  '.txt',
].join(',');

/**
 * Sanitizes a filename so it cannot contain path traversal, control characters,
 * executable double-extensions, or unsafe symbols.
 */
export function sanitizeFileName(rawName: string): string {
  // Strip any path segments
  const base = rawName.split(/[\\/]/).pop() || 'file';
  // Remove leading dots and control characters
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/^\.+/, '')
    .trim();

  const lastDot = cleaned.lastIndexOf('.');
  let stem = lastDot > 0 ? cleaned.slice(0, lastDot) : cleaned;
  let ext = lastDot > 0 ? cleaned.slice(lastDot).toLowerCase() : '';

  stem = stem.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 80) || 'attachment';
  ext = ext.replace(/[^a-z0-9.]/g, '').slice(0, 10);

  return `${stem}${ext}`;
}

/**
 * Resolves the canonical MIME type from a File object's type or extension.
 */
export function resolveCanonicalMimeType(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const extMatch = ALLOWED_EXTENSIONS.find((ext) => lowerName.endsWith(ext));

  if (file.type && ALLOWED_MIME_TYPES[file.type]) {
    return file.type;
  }

  if (!extMatch) return null;

  switch (extMatch) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.pdf':
      return 'application/pdf';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.txt':
      return 'text/plain';
    default:
      return null;
  }
}

/**
 * Validates a File against the allowed types and 10 MB size limit.
 */
export function validateAttachmentFile(file: File): { valid: boolean; error?: string; mimeType?: string } {
  const mimeType = resolveCanonicalMimeType(file);
  if (!mimeType) {
    return {
      valid: false,
      error: `"${file.name}" is not supported. Allowed types: JPG, PNG, WebP, PDF, DOCX, XLSX, PPTX, and TXT.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 10 MB per file.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: `"${file.name}" is empty.`,
    };
  }

  return { valid: true, mimeType };
}

/**
 * Compresses large images (JPG, PNG, WebP) in the browser using an HTML5 canvas
 * before uploading to Firebase Storage.
 */
export async function compressImageIfNeeded(file: File, mimeType: string): Promise<File> {
  if (!mimeType.startsWith('image/')) {
    return file;
  }

  // Only compress if larger than 350 KB or potentially high resolution
  const MAX_DIMENSION = 1920;
  const QUALITY = 0.82;

  return new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      const needsResize = width > MAX_DIMENSION || height > MAX_DIMENSION;
      const needsCompression = file.size > 350 * 1024;

      if (!needsResize && !needsCompression) {
        resolve(file);
        return;
      }

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Keep transparency for PNG/WebP by using image/webp when compressing large PNGs, or keep original mimeType
      const targetMime = mimeType === 'image/png' && file.size > 1024 * 1024 ? 'image/webp' : mimeType;

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          let newName = sanitizeFileName(file.name);
          if (targetMime === 'image/webp' && newName.toLowerCase().endsWith('.png')) {
            newName = newName.replace(/\.png$/i, '.webp');
          }
          const compressedFile = new File([blob], newName, {
            type: targetMime,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        targetMime,
        QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads a validated file to Firebase Storage under:
 * - users/{userId}/tasks/{taskId}/{fileName} (solo/pair tasks)
 * - teams/{teamId}/tasks/{taskId}/{fileName} (team tasks)
 */
export async function uploadTaskFileToStorage(params: {
  file: File;
  userId: string;
  userDisplayName: string;
  taskId: string;
  teamId?: string | null;
  onProgress?: (percent: number) => void;
}): Promise<TaskAttachment> {
  const { file, userId, userDisplayName, taskId, teamId, onProgress } = params;

  const validation = validateAttachmentFile(file);
  if (!validation.valid || !validation.mimeType) {
    throw new Error(validation.error || 'Invalid file');
  }

  const sanitizedOriginalName = sanitizeFileName(file.name);
  const processedFile = await compressImageIfNeeded(file, validation.mimeType);
  const finalMimeType = processedFile.type || validation.mimeType;
  const finalDisplayName = sanitizeFileName(processedFile.name || sanitizedOriginalName);

  // Prefix storage object name with timestamp + random suffix to prevent collisions while preserving sanitized filename
  const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const storageFileName = `${uniquePrefix}_${finalDisplayName}`;

  const storagePath = teamId
    ? `teams/${teamId}/tasks/${taskId}/${storageFileName}`
    : `users/${userId}/tasks/${taskId}/${storageFileName}`;

  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, processedFile, {
    contentType: finalMimeType,
    customMetadata: {
      uploadedBy: userId,
      originalName: finalDisplayName,
      taskId,
    },
  });

  return new Promise<TaskAttachment>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          if (onProgress) onProgress(100);
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: finalDisplayName,
            url: downloadUrl,
            size: processedFile.size,
            type: finalMimeType,
            storagePath,
            isLink: false,
            uploadedBy: userDisplayName,
            uploadedByUid: userId,
            uploadedAt: new Date().toISOString(),
          });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Deletes a single file from Firebase Storage if it has a storagePath.
 */
export async function deleteFileFromStorage(storagePath?: string): Promise<void> {
  if (!storagePath) return;
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  } catch (err: any) {
    // Ignore if object was already deleted
    if (err?.code !== 'storage/object-not-found') {
      console.warn('Could not delete file from Storage:', err);
    }
  }
}

/**
 * Deletes all Storage files associated with an array of TaskAttachments.
 */
export async function deleteAllTaskStorageFiles(attachments?: TaskAttachment[]): Promise<void> {
  if (!attachments || attachments.length === 0) return;
  await Promise.allSettled(
    attachments
      .filter((att) => Boolean(att.storagePath && !att.isLink))
      .map((att) => deleteFileFromStorage(att.storagePath))
  );
}

/**
 * Validates and normalizes an external link URL (must be http:// or https://).
 */
export function validateExternalLink(rawUrl: string): { valid: boolean; url?: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a URL.' };
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only http:// and https:// links are allowed.' };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { valid: false, error: 'Please enter a valid web address (e.g. https://figma.com/...).' };
    }
    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, error: 'Please enter a valid URL.' };
  }
}

export function isImageAttachment(att: TaskAttachment): boolean {
  if (att.isLink || att.type === 'link') return false;
  if (att.type?.startsWith('image/')) return true;
  const lower = att.name.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
}

export function isLinkAttachment(att: TaskAttachment): boolean {
  return Boolean(att.isLink || att.type === 'link');
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
