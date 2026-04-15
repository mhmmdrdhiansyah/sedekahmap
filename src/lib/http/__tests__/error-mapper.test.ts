import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  handleApiError,
} from '../error-mapper';

// Suppress console.error in tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Custom Error Classes', () => {
  it('UnauthorizedError has status 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Anda harus login terlebih dahulu');
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
  });

  it('UnauthorizedError accepts custom message', () => {
    const error = new UnauthorizedError('Token expired');
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Token expired');
  });

  it('ForbiddenError has status 403', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Anda tidak memiliki akses');
  });

  it('ForbiddenError accepts custom message', () => {
    const error = new ForbiddenError('Role tidak cukup');
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Role tidak cukup');
  });

  it('NotFoundError has status 404', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Data tidak ditemukan');
  });

  it('NotFoundError accepts custom message', () => {
    const error = new NotFoundError('Beneficiary tidak ditemukan');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Beneficiary tidak ditemukan');
  });

  it('ConflictError has status 409', () => {
    const error = new ConflictError('NIK sudah terdaftar');
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('NIK sudah terdaftar');
  });

  it('ValidationError has status 400', () => {
    const error = new ValidationError();
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Validasi gagal');
  });

  it('ValidationError stores details', () => {
    const error = new ValidationError('Validasi gagal', ['Nama wajib diisi', 'NIK harus 16 digit']);
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual(['Nama wajib diisi', 'NIK harus 16 digit']);
  });

  it('RateLimitError has status 429', () => {
    const error = new RateLimitError();
    expect(error.statusCode).toBe(429);
    expect(error.message).toBe('Terlalu banyak request');
  });

  it('RateLimitError stores retryAfter', () => {
    const error = new RateLimitError('Coba lagi nanti', 60);
    expect(error.statusCode).toBe(429);
    expect(error.retryAfter).toBe(60);
  });
});

describe('handleApiError - Custom Errors', () => {
  it('maps UnauthorizedError to 401 response', async () => {
    const response = handleApiError(new UnauthorizedError());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Anda harus login terlebih dahulu');
  });

  it('maps ForbiddenError to 403 response', async () => {
    const response = handleApiError(new ForbiddenError());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Anda tidak memiliki akses');
  });

  it('maps NotFoundError to 404 response', async () => {
    const response = handleApiError(new NotFoundError('User tidak ditemukan'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('User tidak ditemukan');
  });

  it('maps ConflictError to 409 response', async () => {
    const response = handleApiError(new ConflictError('NIK sudah terdaftar'));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('NIK sudah terdaftar');
  });

  it('maps ValidationError to 400 response with details', async () => {
    const response = handleApiError(
      new ValidationError('Validasi gagal', ['Email tidak valid', 'Nama wajib diisi'])
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Validasi gagal');
    expect(body.details).toEqual(['Email tidak valid', 'Nama wajib diisi']);
  });

  it('maps ValidationError without details', async () => {
    const response = handleApiError(new ValidationError('Input tidak valid'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Input tidak valid');
    expect(body.details).toBeUndefined();
  });

  it('maps RateLimitError to 429 with Retry-After header', async () => {
    const response = handleApiError(new RateLimitError('Coba lagi nanti', 30));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe('Coba lagi nanti');
    expect(response.headers.get('Retry-After')).toBe('30');
  });

  it('RateLimitError without retryAfter has no header', async () => {
    const response = handleApiError(new RateLimitError());

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeNull();
  });
});

describe('handleApiError - Legacy String Matching', () => {
  it('maps UNAUTHORIZED prefix to 401', async () => {
    const response = handleApiError(new Error('UNAUTHORIZED: Anda harus login terlebih dahulu.'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Anda harus login terlebih dahulu');
  });

  it('maps FORBIDDEN prefix to 403', async () => {
    const response = handleApiError(
      new Error('FORBIDDEN: Membutuhkan permission [beneficiary:create]. Anda tidak memiliki akses ini.')
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Anda tidak memiliki akses');
  });

  it('maps "tidak ditemukan" to 404', async () => {
    const response = handleApiError(new Error('Data penerima manfaat tidak ditemukan'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Data penerima manfaat tidak ditemukan');
  });

  it('maps "sudah terdaftar" to 409', async () => {
    const response = handleApiError(new Error('NIK sudah terdaftar'));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('NIK sudah terdaftar');
  });

  it('maps "sudah memiliki" to 409', async () => {
    const response = handleApiError(new Error('Anda sudah memiliki akses ke region ini'));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('Anda sudah memiliki akses ke region ini');
  });

  it('maps "sudah diproses" to 409', async () => {
    const response = handleApiError(new Error('Distribusi sudah diproses sebelumnya'));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('Distribusi sudah diproses sebelumnya');
  });

  it('maps unknown Error to 400 as fallback', async () => {
    const response = handleApiError(new Error('Some unknown validation error'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Some unknown validation error');
  });
});

describe('handleApiError - Unknown Errors', () => {
  it('maps non-Error thrown value to 500', async () => {
    const response = handleApiError('string error');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Terjadi kesalahan server');
  });

  it('uses custom fallback message for 500', async () => {
    const response = handleApiError(null, 'Gagal memuat data');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Gagal memuat data');
  });

  it('maps thrown object to 500', async () => {
    const response = handleApiError({ code: 'UNKNOWN' });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Terjadi kesalahan server');
  });
});

describe('handleApiError - Logging', () => {
  it('logs legacy errors to console.error', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    handleApiError(new Error('UNAUTHORIZED: test'));

    expect(consoleSpy).toHaveBeenCalledWith('[API Error] UNAUTHORIZED: test');
  });

  it('logs unknown errors to console.error', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    handleApiError('not an error');

    expect(consoleSpy).toHaveBeenCalledWith('[API Error] Unknown error:', 'not an error');
  });
});
