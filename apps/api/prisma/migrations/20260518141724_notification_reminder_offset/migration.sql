-- AlterTable
ALTER TABLE "MediaAlbum" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserCalendarPreference" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "_ChannelTags" ADD CONSTRAINT "_ChannelTags_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ChannelTags_AB_unique";
