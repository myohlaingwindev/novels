export type NovelInput = {
  title: string;
  description: string;
  slug: string;
  genre: string;
  titleMy: string;
  descriptionMy: string;
  sourceTitle: string;
  sourceContent: string;
  sourceAuthor: string;
  originAuthor: string;
  hidden: boolean;
  status?: string;
  language?: string;
  genres?: string[];
};

export type Novel = {
  id: number;
  ownerId: number;
  title: string;
  description: string;
  titleMy: string;
  descriptionMy: string;
  sourceTitle: string;
  sourceContent: string;
  sourceAuthor: string;
  originAuthor: string;
  genre: string;
  genres: string[];
  status: string;
  language: string;
  hidden: boolean;
  slug: string;
  createdAt: number;
  updatedAt: number;
};
