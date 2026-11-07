-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cooperativaId" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_cooperativaId_fkey" FOREIGN KEY ("cooperativaId") REFERENCES "cooperativas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

