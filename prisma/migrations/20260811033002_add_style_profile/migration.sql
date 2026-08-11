-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "styleDeltas" JSONB,
ADD COLUMN     "styleScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "StyleProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "traits" JSONB NOT NULL,
    "sourceSampleIds" JSONB NOT NULL,
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StyleProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StyleProfile_userId_key" ON "StyleProfile"("userId");
