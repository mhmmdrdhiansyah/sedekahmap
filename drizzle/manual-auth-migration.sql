-- Run this SQL manually in your PostgreSQL database (pgAdmin, psql, etc.)
-- This creates the new auth security tables and columns

-- 1. Add new columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_failed_login_at" timestamp with time zone;

-- 2. Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "email_verification_tokens_token_hash_unique" UNIQUE("token_hash")
);

ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_user_id" ON "email_verification_tokens" ("user_id");

-- 3. Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id");

-- 4. Create auth_rate_limits table
CREATE TABLE IF NOT EXISTS "auth_rate_limits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(255) NOT NULL,
  "request_count" integer DEFAULT 1 NOT NULL,
  "window_start" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "auth_rate_limits_key_unique" UNIQUE("key")
);

CREATE INDEX IF NOT EXISTS "idx_auth_rate_limits_key" ON "auth_rate_limits" ("key");
CREATE INDEX IF NOT EXISTS "idx_auth_rate_limits_window_start" ON "auth_rate_limits" ("window_start");

-- 5. Update existing users to have emailVerifiedAt (for backwards compatibility)
UPDATE "users" SET "email_verified_at" = now() WHERE "email_verified_at" IS NULL;
