CREATE TABLE "novel_genres" (
    "novel_id" BIGINT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "novel_genres_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("novel_id", "slug")
);

INSERT OR IGNORE INTO "novel_genres" ("novel_id", "slug", "position")
SELECT "id", "genre", 0 FROM "novels" WHERE trim("genre") <> '';
