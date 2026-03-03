-- CreateTable
CREATE TABLE "todo_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todo_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "release_todos" ADD CONSTRAINT "release_todos_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "todo_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
