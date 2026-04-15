import { NextResponse } from 'next/server';

// ============================================================
// CUSTOM ERROR CLASSES
// ============================================================

export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: string[];

  constructor(message: string, statusCode: number, details?: string[]) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    if (details) {
      this.details = details;
    }
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Anda harus login terlebih dahulu') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Anda tidak memiliki akses') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Data tidak ditemukan') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validasi gagal', details?: string[]) {
    super(message, 400, details);
  }
}

export class RateLimitError extends AppError {
  readonly retryAfter?: number;

  constructor(message: string = 'Terlalu banyak request', retryAfter?: number) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}

// ============================================================
// ERROR RESPONSE BUILDER
// ============================================================

function buildErrorResponse(error: AppError): NextResponse {
  const body: Record<string, unknown> = { error: error.message };

  if (error.details && error.details.length > 0) {
    body.details = error.details;
  }

  const headers: Record<string, string> = {};

  if (error instanceof RateLimitError && error.retryAfter) {
    headers['Retry-After'] = String(error.retryAfter);
  }

  return NextResponse.json(body, { status: error.statusCode, headers });
}

// ============================================================
// LEGACY ERROR MATCHING
// ============================================================

function matchLegacyError(error: Error): NextResponse {
  const msg = error.message;

  // Auth errors (from auth-utils.ts)
  if (msg.startsWith('UNAUTHORIZED')) {
    return NextResponse.json(
      { error: 'Anda harus login terlebih dahulu' },
      { status: 401 }
    );
  }

  if (msg.startsWith('FORBIDDEN')) {
    return NextResponse.json(
      { error: 'Anda tidak memiliki akses' },
      { status: 403 }
    );
  }

  // Not found
  if (msg.includes('tidak ditemukan')) {
    return NextResponse.json({ error: msg }, { status: 404 });
  }

  // Conflict / duplicate / already processed
  if (
    msg.includes('sudah terdaftar') ||
    msg.includes('sudah memiliki') ||
    msg.includes('sudah memberikan') ||
    msg.includes('sudah diproses')
  ) {
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // Fallback: treat as bad request
  return NextResponse.json({ error: msg }, { status: 400 });
}

// ============================================================
// MAIN HANDLER
// ============================================================

/**
 * handleApiError - Map any error to a consistent HTTP response.
 *
 * Supports:
 * 1. Custom AppError subclasses (new pattern) → reads statusCode directly
 * 2. Plain Error with legacy prefixes (old pattern) → string matching
 * 3. Unknown errors → 500 with fallback message
 *
 * @param error - The thrown error
 * @param fallbackMessage - Custom message for 500 responses (default: 'Terjadi kesalahan server')
 */
export function handleApiError(
  error: unknown,
  fallbackMessage: string = 'Terjadi kesalahan server'
): NextResponse {
  // New pattern: typed errors
  if (error instanceof AppError) {
    return buildErrorResponse(error);
  }

  // Legacy pattern: plain Error with string-based error codes
  if (error instanceof Error) {
    console.error(`[API Error] ${error.message}`);
    return matchLegacyError(error);
  }

  // Unknown error type
  console.error('[API Error] Unknown error:', error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
