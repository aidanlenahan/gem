-- Add replyToId to Message for reply-to-message functionality
ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT;
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");
