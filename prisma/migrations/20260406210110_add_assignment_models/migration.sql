-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "joinCode" VARCHAR(16) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "quizSnapshot" JSONB NOT NULL,
    "sourceSavedQuizId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" VARCHAR(80),
    "score" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" VARCHAR(128) NOT NULL,

    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_publicId_key" ON "Assignment"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_joinCode_key" ON "Assignment"("joinCode");

-- CreateIndex
CREATE INDEX "Assignment_ownerId_createdAt_idx" ON "Assignment"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_assignmentId_completedAt_idx" ON "AssignmentSubmission"("assignmentId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_idempotencyKey_key" ON "AssignmentSubmission"("assignmentId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_userId_key" ON "AssignmentSubmission"("assignmentId", "userId");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_sourceSavedQuizId_fkey" FOREIGN KEY ("sourceSavedQuizId") REFERENCES "SavedQuiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
