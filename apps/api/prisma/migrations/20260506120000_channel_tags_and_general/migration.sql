-- Add isGeneral flag to Channel
ALTER TABLE "Channel" ADD COLUMN "isGeneral" BOOLEAN NOT NULL DEFAULT false;

-- Mark existing "general" channels as isGeneral = true
UPDATE "Channel" SET "isGeneral" = true WHERE "name" = 'general';

-- Backfill: create a general channel for any group that doesn't have one
INSERT INTO "Channel" ("id", "groupId", "name", "isInviteOnly", "isGeneral", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  g.id,
  'general',
  false,
  true,
  NOW(),
  NOW()
FROM "Group" g
WHERE NOT EXISTS (
  SELECT 1 FROM "Channel" c WHERE c."groupId" = g.id AND c."name" = 'general'
);

-- Join table for Channel <-> Tag (many-to-many)
CREATE TABLE "_ChannelTags" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_ChannelTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "_ChannelTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "_ChannelTags_AB_unique" ON "_ChannelTags"("A", "B");
CREATE INDEX "_ChannelTags_B_index" ON "_ChannelTags"("B");
