# Security Hardening — Authentication System

Dokumentasi ini menjelaskan fitur keamanan yang telah diimplementasikan pada sistem autentikasi SedekahMap.

## Fitur Keamanan

### 1. Password Policy

- **Minimum panjang**: 8 karakter
- **Hashing**: bcrypt dengan 12 salt rounds
- **Library**: bcrypt (native async, bukan bcryptjs yang blocking)

### 2. Email Verification

- **Token TTL**: 24 jam
- **Storage**: Token di-hash dengan SHA-256 sebelum disimpan
- **Enforcement**: User yang register publik wajib verifikasi email sebelum login
- **Admin-created users**: Otomatis verified (pre-trusted)

### 3. Password Reset

- **Token TTL**: 30 menit
- **One-time use**: Token hanya bisa dipakai sekali
- **Anti-enumeration**: Selalu return success untuk mencegah user enumeration
- **Rate limiting**: Terbatas per IP

### 4. Account Lockout

- **Threshold**: 5 gagal login
- **Lock duration**: 15 menit
- **Fields**:
  - `failedLoginAttempts`: counter gagal login
  - `lockedUntil`: timestamp kapan lock berakhir
  - `lastFailedLoginAt`: timestamp gagal login terakhir

### 5. Rate Limiting

- **Register**: 3 percobaan per jam per IP
- **Login**: 5 percobaan per 15 menit per email+IP
- **Storage**: Database-based sliding window
- **Response**: HTTP 429 dengan header `Retry-After`

## Environment Variables

Tambahkan ke `.env.local`:

```bash
# App URL (untuk link email verifikasi/reset password)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Service (opsional untuk development)
# Jika tidak diset, email akan di-log ke console saja
RESEND_API_KEY=
EMAIL_FROM=noreply@sedekahmap.id
```

## Security Event Logging

Sistem mencatat event keamanan berikut:

| Event | Level | Format |
|-------|-------|--------|
| Login successful | INFO | `[AUTH] Login successful: {email}, roles={roles}` |
| Login failed | INFO | `[AUTH] Login attempt with non-existent email: {email}` |
| Account inactive | INFO | `[AUTH] Login attempt with inactive account: {email}` |
| Account locked | INFO | `[AUTH] Account locked: {email} until {timestamp}` |
| Email not verified | INFO | `[AUTH] Login attempt without email verification: {email}` |
| Registration | INFO | `[AUTH] Registration successful: {email}` |
| Password reset requested | INFO | `[PASSWORD RESET] Password reset requested: {email}` |
| Password reset success | INFO | `[PASSWORD RESET] Password reset successful: userId={userId}` |
| Email verified | INFO | `[EMAIL VERIFICATION] Email verified successfully: userId={userId}` |
| Rate limited | INFO | `[RATE LIMIT] Blocked: key={key}, count={count}/{limit}` |

## Database Schema

### email_verification_tokens

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid (FK) | User yang melakukan register |
| token_hash | text | Hash SHA-256 dari token raw |
| expires_at | timestamp | Token expiry (24 jam) |
| used_at | timestamp | Kapan token digunakan |
| created_at | timestamp | Token creation time |

### password_reset_tokens

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid (FK) | User yang request reset |
| token_hash | text | Hash SHA-256 dari token raw |
| expires_at | timestamp | Token expiry (30 menit) |
| used_at | timestamp | Kapan token digunakan |
| created_at | timestamp | Token creation time |

### auth_rate_limits

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| key | varchar | Unique identifier (e.g., "login:email:xxx", "register:ip:xxx") |
| request_count | integer | Jumlah request dalam window |
| window_start | timestamp | Awal window waktu |
| created_at | timestamp | Record creation time |
| updated_at | timestamp | Record update time |

### users (new columns)

| Column | Type | Description |
|--------|------|-------------|
| failed_login_attempts | integer | Counter gagal login (default: 0) |
| locked_until | timestamp | Kapan lock berakhir (nullable) |
| last_failed_login_at | timestamp | Gagal login terakhir (nullable) |

## API Endpoints

### Authentication

| Endpoint | Method | Auth | Rate Limit |
|----------|--------|------|------------|
| `/api/auth/register` | POST | None | 3/hour/IP |
| `/api/auth/[...nextauth]` | POST | None | 5/15min/email+IP |
| `/api/auth/verify-email` | GET/POST | None | - |
| `/api/auth/forgot-password` | POST | None | - |
| `/api/auth/reset-password` | POST | None | - |

## Flow Diagrams

### Registration Flow

```
User → POST /api/auth/register
  ↓
Rate limit check
  ↓
Create user (donatur role)
  ↓
Generate email verification token
  ↓
Send email (or log to console in dev)
  ↓
Return 201
```

### Login Flow

```
User → POST /api/auth/[...nextauth]
  ↓
Find user by email
  ↓
Check isActive
  ↓
Check account lockout
  ↓
Verify password
  ↓
[IF wrong] → Increment failed counter → [IF threshold] → Lock account
  ↓
Check emailVerifiedAt
  ↓
[IF null] → Reject with EMAIL_NOT_VERIFIED
  ↓
Reset failed counter
  ↓
Return session
```

### Password Reset Flow

```
User → POST /api/auth/forgot-password
  ↓
Find user by email (silent fail if not found)
  ↓
Generate reset token
  ↓
Send email (or log to console)
  ↓
Always return success (anti-enumeration)
```

```
User → POST /api/auth/reset-password
  ↓
Validate token
  ↓
Validate password strength
  ↓
Update password
  ↓
Mark token as used
  ↓
Return success
```

## Testing

### Manual Testing

1. **Register user baru**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"Test1234"}'
   ```
   Cek console untuk link verifikasi.

2. **Login tanpa verifikasi**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/[...nextauth] \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test1234"}'
   ```
   Harus return error "Email belum diverifikasi".

3. **Trigger lockout**:
   Login 5x dengan password salah. Pada percobaan ke-5, akun terkunci.

4. **Reset password**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```
   Cek console untuk link reset.

### Unit Tests

Jalankan tests:
```bash
npm run test
```

Test files:
- `src/services/__tests__/auth.service.test.ts` — Lockout logic
- `src/services/__tests__/user.service.test.ts` — Register validation
- `src/services/__tests__/password-reset.service.test.ts` — Reset token lifecycle
- `src/services/__tests__/email-verification.service.test.ts` — Verification token lifecycle
- `src/services/__tests__/rate-limit.service.test.ts` — Rate limiting

## Migration

Apply schema changes:
```bash
npm run db:push
```

Atau jalankan migration manual:
```bash
npm run db:migrate
```

## Production Checklist

- [ ] Set `NEXT_PUBLIC_APP_URL` ke production URL
- [ ] Set `RESEND_API_KEY` untuk email production
- [ ] Set `EMAIL_FROM` ke domain email yang valid
- [ ] Enable HTTPS untuk semua endpoints
- [ ] Set up log aggregation (sent to monitoring service)
- [ ] Configure alert untuk security events (lockout, rate limit exceeded)
- [ ] Review password reset tokens cleanup (consider scheduled job)

## Rollback Plan

Jika ada issue setelah deployment:

1. **Immediate rollback** — Revert code changes
2. **Database** — Migration tidak menghapus data, hanya menambah kolom
3. **Email verification** — Bisa ditunda dengan mengubah authorize logic untuk sementara melewati cek emailVerifiedAt
4. **Lockout** — User yang terkunci akan bisa login lagi setelah lock period (15 menit) berakhir

## Security Considerations

1. **Token storage** — Raw tokens tidak pernah tersimpan di database
2. **User enumeration** — Forgot password dan login error messages tidak bocorkan user existence
3. **Timing attacks** — Token comparison menggunakan timing-safe comparison
4. **Brute force** — Rate limiting + account lockout bekerja berlapis
5. **Password reset** — Token hanya sekali pakai dan expiry cepat (30 menit)
6. **Email verification** — Mencegah spam registrasi dan memvalidasi email ownership
