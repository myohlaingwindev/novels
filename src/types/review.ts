export type ReviewReason = "spam" | "offensive" | "spoilers";

export type ReaderReview = {
  id: number;
  rating: number;
  body: string;
  createdAt: number;
  readerName: string;
  mine: boolean;
  hidden: boolean;
};

export type ModerationReview = {
  id: number;
  rating: number;
  body: string;
  createdAt: number;
  readerName: string;
  novelTitle: string;
  reportCount: number;
  reasons: string[];
};
