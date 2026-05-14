-- Migration: group_media_settings
-- Adds per-group media upload controls and a storage cap.

ALTER TABLE "Group"
  ADD COLUMN "mediaUploadEnabled"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mediaStorageLimitBytes"      BIGINT  NOT NULL DEFAULT 104857600,
  ADD COLUMN "mediaUploadNonAdminEnabled"  BOOLEAN NOT NULL DEFAULT true;
