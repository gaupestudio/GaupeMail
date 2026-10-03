/*
  Warnings:

  - Added the required column `cfAccountId` to the `Domain` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cfApiToken` to the `Domain` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Domain" ADD COLUMN     "cfAccountId" TEXT NOT NULL,
ADD COLUMN     "cfApiToken" TEXT NOT NULL;
