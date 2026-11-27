export type ChapterInput = {
  title: string;
  body: string;
  titleMy: string;
  bodyMy: string;
  hidden: boolean;
};

export type Chapter = {
  id: number;
  novelId: number;
  number: number;
  title: string;
  body: string;
  titleMy: string;
  bodyMy: string;
  hidden: boolean;
  createdAt: number;
  updatedAt: number;
};

export type IncomingChapterInput = {
  novelId: number;
  title: string;
  body: string;
  titleMy: string;
  bodyMy: string;
  hidden: boolean;
};

export type ChapterText = {
  number: number;
  title: string;
  body: string;
  titleMy: string;
  bodyMy: string;
};

export type IncomingChapterResult =
  | { ok: true; chapter: Chapter }
  | { ok: false; error: "unauthorized" | "missing" | "forbidden" | "burmeseBody" };

export type ReadChapterResult = ({ ok: true } & ChapterText) | { ok: false; error: "missing" };

export type ChapterListItem = {
  number: number;
  title: string;
  titleMy: string;
  hidden: boolean;
};

export type ChapterListResult =
  | { ok: true; novelId: number; chapters: ChapterListItem[] }
  | { ok: false; error: "missing" };
