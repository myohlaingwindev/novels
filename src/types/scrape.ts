export type ScrapedChapter = {
    number: number;
    title: string;
    titleMy: string;
    hidden: boolean;
    url: string;
  };


  export type ScrapedNovel = {
    source: string;
    novelTitle: string;
    totalChapters: number; // chapters found in the listing
    chapters: ChapterContent[];
    failed: number[]; // chapter numbers that could not be fetched
  };
  export type ChapterContent = {
    url: string;
    number: number;
    title: string;
    body: string;
  };

  