-- AddForeignKey
ALTER TABLE "WeeklyTarget" ADD CONSTRAINT "WeeklyTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
