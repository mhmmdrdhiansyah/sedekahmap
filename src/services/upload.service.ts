import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// ============================================================
// TYPES
// ============================================================

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadResult {
  url: string;
  filename: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'proofs');

// ============================================================
// VALIDATION
// ============================================================

/**
 * validateUploadFile - Validate uploaded file
 * @param file - The file to validate (from formData)
 * @returns Validation result with error message if invalid
 */
export function validateUploadFile(file: File | null): UploadValidationResult {
  if (!file) {
    return { valid: false, error: 'File harus diisi' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Ukuran file terlalu besar. Maksimal 5MB (file Anda: ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    };
  }

  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipe file tidak valid. Hanya JPG, PNG, dan WebP yang diperbolehkan',
    };
  }

  return { valid: true };
}

// ============================================================
// UPLOAD FUNCTIONS
// ============================================================

/**
 * uploadProofPhoto - Save proof photo to public/uploads/proofs/
 * @param file - The file to upload (from formData)
 * @returns The URL of the uploaded file
 * @throws Error if validation fails or file cannot be saved
 */
export async function uploadProofPhoto(file: File): Promise<UploadResult> {
  // Validate file
  const validation = validateUploadFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const ext = getFileExtension(file.type);
  const filename = `proof-${timestamp}-${random}.${ext}`;

  // Convert file to buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Write file to disk
  const filepath = join(UPLOAD_DIR, filename);
  await writeFile(filepath, buffer);

  // Return URL (relative to public directory)
  return {
    url: `/uploads/proofs/${filename}`,
    filename,
  };
}

/**
 * getFileExtension - Get file extension from MIME type
 * @param mimeType - The MIME type of the file
 * @returns The file extension (without dot)
 */
function getFileExtension(mimeType: string): string {
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return extMap[mimeType] || 'jpg';
}
