export type CreditRules = {
  dailyFree: number;
  chapterPrice: number;
  freeChapters: number;
  resetLabel: string;
};

export type CreditRow = {
  id: number;
  email: string;
  kind: string;
  amount: number;
  note: string;
  actor: string;
  balanceAfter: number;
  createdAt: number;
};

export type PromotionRecord = {
  id: number;
  name: string;
  kind: string;
  value: number;
  scope: string;
  startsOn: string;
  endsOn: string;
  active: boolean;
  createdAt: number;
};
