-- AlterTable: customer_users tablosuna davet (invitation) kolonları eklendi
-- Bu kolonlar daha önce Prisma schema'ya eklenmiş ancak migration oluşturulmamıştı.
ALTER TABLE "customer_users" ADD COLUMN IF NOT EXISTS "invitationToken" TEXT;
ALTER TABLE "customer_users" ADD COLUMN IF NOT EXISTS "invitationExpiry" TIMESTAMP(3);

-- CreateIndex: invitationToken unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "customer_users_invitationToken_key" ON "customer_users"("invitationToken");
