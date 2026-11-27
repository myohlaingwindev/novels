ALTER TABLE novels ADD COLUMN status TEXT NOT NULL DEFAULT 'ongoing';
ALTER TABLE novels ADD COLUMN language TEXT NOT NULL DEFAULT 'english';

CREATE TABLE "reviews" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT NOT NULL,
    "novel_id" BIGINT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reviews_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "reviews_user_id_novel_id_key" ON "reviews"("user_id", "novel_id");

CREATE TABLE "review_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "review_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "review_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_reports_review_id_user_id_key" ON "review_reports"("review_id", "user_id");
