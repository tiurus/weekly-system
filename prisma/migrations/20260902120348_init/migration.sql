-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('MINIMUM', 'NORMAL', 'RESOURCE');

-- CreateEnum
CREATE TYPE "WeekStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AnchorSlot" AS ENUM ('FOCUS', 'BODY', 'SHUTDOWN');

-- CreateEnum
CREATE TYPE "Background" AS ENUM ('CALM', 'STRESS', 'ILLNESS', 'TRAVEL', 'OTHER');

-- CreateEnum
CREATE TYPE "TrackingSemantics" AS ENUM ('DAY_WITHOUT', 'INCIDENT');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Moscow',
    "workdayEndTime" VARCHAR(5) NOT NULL DEFAULT '20:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Week" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "status" "WeekStatus" NOT NULL DEFAULT 'ACTIVE',
    "mainOutcome" TEXT,
    "reflectionSupport" TEXT,
    "reflectionChange" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "weekId" UUID,
    "localDate" DATE NOT NULL,
    "energy" INTEGER,
    "sleep" INTEGER,
    "background" "Background",
    "morningNote" TEXT,
    "suggestedMode" "Mode",
    "selectedMode" "Mode",
    "modeManuallySelected" BOOLEAN NOT NULL DEFAULT false,
    "primaryFocus" TEXT,
    "focusDone" BOOLEAN NOT NULL DEFAULT false,
    "bodyDone" BOOLEAN NOT NULL DEFAULT false,
    "shutdownDone" BOOLEAN NOT NULL DEFAULT false,
    "eveningNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAnchorTemplate" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mode" "Mode" NOT NULL,
    "slot" "AnchorSlot" NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAnchorTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyTarget" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "weekId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "targetSessions" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivitySession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "dailyLogId" UUID,
    "idempotencyKey" VARCHAR(64) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivitySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Constraint" (
    "id" UUID NOT NULL,
    "weekId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "semantics" "TrackingSemantics" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Constraint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Week_userId_status_idx" ON "Week"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Week_userId_startsOn_key" ON "Week"("userId", "startsOn");

-- CreateIndex
CREATE INDEX "DailyLog_userId_weekId_idx" ON "DailyLog"("userId", "weekId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_userId_localDate_key" ON "DailyLog"("userId", "localDate");

-- CreateIndex
CREATE INDEX "DailyAnchorTemplate_userId_mode_idx" ON "DailyAnchorTemplate"("userId", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAnchorTemplate_userId_mode_slot_key" ON "DailyAnchorTemplate"("userId", "mode", "slot");

-- CreateIndex
CREATE INDEX "WeeklyTarget_userId_weekId_idx" ON "WeeklyTarget"("userId", "weekId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyTarget_weekId_position_key" ON "WeeklyTarget"("weekId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ActivitySession_idempotencyKey_key" ON "ActivitySession"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ActivitySession_userId_targetId_idx" ON "ActivitySession"("userId", "targetId");

-- CreateIndex
CREATE INDEX "Constraint_weekId_active_idx" ON "Constraint"("weekId", "active");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Week" ADD CONSTRAINT "Week_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAnchorTemplate" ADD CONSTRAINT "DailyAnchorTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTarget" ADD CONSTRAINT "WeeklyTarget_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySession" ADD CONSTRAINT "ActivitySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySession" ADD CONSTRAINT "ActivitySession_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "WeeklyTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySession" ADD CONSTRAINT "ActivitySession_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Constraint" ADD CONSTRAINT "Constraint_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;
