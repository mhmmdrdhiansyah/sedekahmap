ALTER TYPE "public"."beneficiary_status" ADD VALUE 'pending' BEFORE 'verified';--> statement-breakpoint
ALTER TYPE "public"."beneficiary_status" ADD VALUE 'rejected' BEFORE 'verified';--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "created_by_id" uuid;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "approved_by_id" uuid;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "rejected_by_id" uuid;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_created_by_id" ON "beneficiaries" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_approved_by_id" ON "beneficiaries" USING btree ("approved_by_id");