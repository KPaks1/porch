-- AlterTable
ALTER TABLE "User" ADD COLUMN     "invitesUsed" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User" ADD CONSTRAINT "User_invitesUsed_nonnegative" CHECK ("invitesUsed" >= 0);

UPDATE "User" AS u
SET "invitesUsed" = (SELECT COUNT(*) FROM "User" AS i WHERE i."invitedById" = u."id");
