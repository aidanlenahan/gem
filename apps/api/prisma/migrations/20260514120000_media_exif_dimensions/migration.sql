-- Add EXIF metadata and image dimensions to MediaAsset
ALTER TABLE "MediaAsset" ADD COLUMN "width" INTEGER;
ALTER TABLE "MediaAsset" ADD COLUMN "height" INTEGER;
ALTER TABLE "MediaAsset" ADD COLUMN "exifData" JSONB;
