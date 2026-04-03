CREATE TYPE "public"."beneficiary_status" AS ENUM('verified', 'in_progress', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."access_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."distribution_status" AS ENUM('pending_proof', 'pending_review', 'completed', 'rejected');--> statement-breakpoint
CREATE TABLE "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"level" integer NOT NULL,
	"parent_code" varchar(20),
	CONSTRAINT "regions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"phone" varchar(20),
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"module" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nik" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"needs" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"region_code" varchar(20) NOT NULL,
	"status" "beneficiary_status" DEFAULT 'verified' NOT NULL,
	"verified_by_id" uuid,
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donatur_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"intention" text NOT NULL,
	"status" "access_request_status" DEFAULT 'pending' NOT NULL,
	"distribution_code" varchar(20),
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"access_request_id" uuid NOT NULL,
	"donatur_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"distribution_code" varchar(20) NOT NULL,
	"proof_photo_url" text,
	"status" "distribution_status" DEFAULT 'pending_proof' NOT NULL,
	"verified_by_id" uuid,
	"verified_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distributions_distribution_code_unique" UNIQUE("distribution_code")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distribution_id" uuid NOT NULL,
	"donatur_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_regions_code" ON "regions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_regions_parent_code" ON "regions" USING btree ("parent_code");--> statement-breakpoint
CREATE INDEX "idx_regions_level" ON "regions" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_user_roles_user_id" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_role_id" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_is_active" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_role_id" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_permission_id" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "idx_roles_name" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_permissions_name" ON "permissions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_permissions_module" ON "permissions" USING btree ("module");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_region_code" ON "beneficiaries" USING btree ("region_code");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_status" ON "beneficiaries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_verified_by_id" ON "beneficiaries" USING btree ("verified_by_id");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_expires_at" ON "beneficiaries" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_lat_lng" ON "beneficiaries" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_access_requests_donatur_id" ON "access_requests" USING btree ("donatur_id");--> statement-breakpoint
CREATE INDEX "idx_access_requests_beneficiary_id" ON "access_requests" USING btree ("beneficiary_id");--> statement-breakpoint
CREATE INDEX "idx_access_requests_status" ON "access_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_access_requests_distribution_code" ON "access_requests" USING btree ("distribution_code");--> statement-breakpoint
CREATE INDEX "idx_distributions_access_request_id" ON "distributions" USING btree ("access_request_id");--> statement-breakpoint
CREATE INDEX "idx_distributions_donatur_id" ON "distributions" USING btree ("donatur_id");--> statement-breakpoint
CREATE INDEX "idx_distributions_beneficiary_id" ON "distributions" USING btree ("beneficiary_id");--> statement-breakpoint
CREATE INDEX "idx_distributions_distribution_code" ON "distributions" USING btree ("distribution_code");--> statement-breakpoint
CREATE INDEX "idx_distributions_status" ON "distributions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reviews_distribution_id" ON "reviews" USING btree ("distribution_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_donatur_id" ON "reviews" USING btree ("donatur_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_rating" ON "reviews" USING btree ("rating");