-- Change mediaStorageLimitBytes from BIGINT to INTEGER.
-- Max value we allow is 1 GB = 1,073,741,824 which fits in INT4 (max 2,147,483,647).
-- BIGINT caused JSON serialization failures since Prisma returns it as BigInt.

ALTER TABLE "Group"
  ALTER COLUMN "mediaStorageLimitBytes" TYPE INTEGER USING "mediaStorageLimitBytes"::INTEGER;
