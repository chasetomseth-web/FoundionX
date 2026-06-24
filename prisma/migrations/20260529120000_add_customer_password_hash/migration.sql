-- Add password_hash field to Customer model for portal auth
ALTER TABLE "Customer" ADD COLUMN "passwordHash" TEXT;