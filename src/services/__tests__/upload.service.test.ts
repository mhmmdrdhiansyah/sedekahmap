import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUploadFile, uploadProofPhoto } from '../upload.service';

// Mock fs modules
vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

describe('upload.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // validateUploadFile
  // ============================================================

  describe('validateUploadFile', () => {
    it('returns valid for a correct JPEG file', () => {
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = validateUploadFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns valid for PNG file', () => {
      const file = new File(['test'], 'photo.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = validateUploadFile(file);

      expect(result.valid).toBe(true);
    });

    it('returns valid for WebP file', () => {
      const file = new File(['test'], 'photo.webp', { type: 'image/webp' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = validateUploadFile(file);

      expect(result.valid).toBe(true);
    });

    it('returns invalid when file is null', () => {
      const result = validateUploadFile(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File harus diisi');
    });

    it('returns invalid for oversized file (> 5MB)', () => {
      const file = new File(['test'], 'big.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 }); // 6MB

      const result = validateUploadFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('terlalu besar');
      expect(result.error).toContain('5MB');
    });

    it('returns invalid for wrong MIME type (PDF)', () => {
      const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = validateUploadFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tipe file tidak valid');
    });

    it('returns invalid for executable file', () => {
      const file = new File(['test'], 'malware.exe', { type: 'application/x-msdownload' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = validateUploadFile(file);

      expect(result.valid).toBe(false);
    });

    it('accepts file at exactly 5MB limit', () => {
      const file = new File(['test'], 'exact.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // exactly 5MB

      const result = validateUploadFile(file);

      expect(result.valid).toBe(true);
    });

    /**
     * KNOWN GAP: MIME type spoofing
     *
     * This test documents that validateUploadFile currently only checks
     * `file.type` from the client, which can be spoofed. Server-side
     * file signature (magic number) validation is needed (Issue #90 / Issue 3).
     */
    it('accepts spoofed MIME type (known gap, addressed by Issue 3)', () => {
      const file = new File(['malicious content'], 'evil.php', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = validateUploadFile(file);

      // Currently passes - this is a known vulnerability
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================
  // uploadProofPhoto
  // ============================================================

  describe('uploadProofPhoto', () => {
    it('throws error when file validation fails', async () => {
      await expect(uploadProofPhoto(null as any)).rejects.toThrow('File harus diisi');
    });

    it('successfully uploads a valid file', async () => {
      const { writeFile } = await import('fs/promises');

      const file = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = await uploadProofPhoto(file);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('filename');
      expect(result.url).toContain('/uploads/proofs/');
      expect(result.filename).toMatch(/^proof-\d+-[a-z0-9]+\.jpg$/);
      expect(writeFile).toHaveBeenCalled();
    });

    it('creates directory if it does not exist', async () => {
      const { existsSync } = await import('fs');
      const { mkdir } = await import('fs/promises');

      (existsSync as any).mockReturnValue(false);

      const file = new File(['fake image data'], 'photo.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 });

      await uploadProofPhoto(file);

      expect(mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('does not create directory if it already exists', async () => {
      const { existsSync } = await import('fs');
      const { mkdir } = await import('fs/promises');

      (existsSync as any).mockReturnValue(true);

      const file = new File(['fake image data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });

      await uploadProofPhoto(file);

      expect(mkdir).not.toHaveBeenCalled();
    });
  });
});
