export type FetchLike = (
  url: string,
  init: { redirect: "manual"; signal: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  url: string;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export type GrabResult =
  | { ok: true; title: string; body: string; notices: string[] }
  | { ok: false; error: "forbidden" | "missing" | "selectors" | "url" | "fetch" };
