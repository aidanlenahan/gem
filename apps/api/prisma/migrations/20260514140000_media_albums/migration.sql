CREATE TABLE "MediaAlbum" (
  "id"           TEXT NOT NULL,
  "groupId"      TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "createdById"  TEXT,
  "coverAssetId" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAlbum_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAlbumAsset" (
  "albumId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAlbumAsset_pkey" PRIMARY KEY ("albumId", "assetId")
);

CREATE INDEX "MediaAlbum_groupId_idx" ON "MediaAlbum"("groupId");
CREATE INDEX "MediaAlbumAsset_albumId_idx" ON "MediaAlbumAsset"("albumId");
CREATE INDEX "MediaAlbumAsset_assetId_idx" ON "MediaAlbumAsset"("assetId");

ALTER TABLE "MediaAlbum" ADD CONSTRAINT "MediaAlbum_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAlbum" ADD CONSTRAINT "MediaAlbum_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaAlbum" ADD CONSTRAINT "MediaAlbum_coverAssetId_fkey"
  FOREIGN KEY ("coverAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaAlbumAsset" ADD CONSTRAINT "MediaAlbumAsset_albumId_fkey"
  FOREIGN KEY ("albumId") REFERENCES "MediaAlbum"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAlbumAsset" ADD CONSTRAINT "MediaAlbumAsset_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
