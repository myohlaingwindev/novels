ALTER TABLE genres ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN balance INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "credit_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "daily_free" INTEGER NOT NULL DEFAULT 1,
    "chapter_price" INTEGER NOT NULL DEFAULT 1,
    "free_chapters" INTEGER NOT NULL DEFAULT 3,
    "reset_label" TEXT NOT NULL DEFAULT '00:00 Thailand time'
);

CREATE TABLE "credit_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "actor" TEXT NOT NULL DEFAULT 'System',
    "balance_after" INTEGER NOT NULL,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "credit_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "promotions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'all',
    "starts_on" TEXT NOT NULL DEFAULT '',
    "ends_on" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL
);
