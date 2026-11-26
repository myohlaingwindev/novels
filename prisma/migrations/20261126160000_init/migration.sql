-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "novels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "owner_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "title_my" TEXT NOT NULL DEFAULT '',
    "description_my" TEXT NOT NULL DEFAULT '',
    "source_title" TEXT NOT NULL DEFAULT '',
    "source_content" TEXT NOT NULL DEFAULT '',
    "source_author" TEXT NOT NULL DEFAULT '',
    "origin_author" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT 'english',
    "hidden" BOOLEAN NOT NULL DEFAULT true,
    "slug" TEXT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "novels_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "novel_id" BIGINT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "title_my" TEXT NOT NULL DEFAULT '',
    "body_my" TEXT NOT NULL DEFAULT '',
    "hidden" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "chapters_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "genres" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "label_my" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "glossary_terms" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "novel_id" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
    "burmese" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "glossary_terms_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" BIGINT NOT NULL,
    "novel_id" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,

    PRIMARY KEY ("user_id", "novel_id"),
    CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "favorites_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "progress" (
    "user_id" BIGINT NOT NULL,
    "novel_id" BIGINT NOT NULL,
    "chapter_id" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    PRIMARY KEY ("user_id", "novel_id"),
    CONSTRAINT "progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "progress_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "progress_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "id_hash" TEXT NOT NULL PRIMARY KEY,
    "user_id" BIGINT NOT NULL,
    "expires_at" BIGINT NOT NULL,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "novels_slug_key" ON "novels"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_novel_id_number_key" ON "chapters"("novel_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "glossary_terms_novel_id_source_key" ON "glossary_terms"("novel_id", "source");
