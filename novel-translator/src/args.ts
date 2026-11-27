export type TranslatorArgs = {
  url: string;
  count: number;
  mode: "file" | "draft" | "publish";
  novelId: number | null;
};

export function parseArgs(argv: string[]): { ok: true } & TranslatorArgs | { ok: false; error: string } {
  let url = "";
  let count = 1;
  let mode: TranslatorArgs["mode"] = "file";
  let novelId: number | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--count" || arg === "--draft" || arg === "--publish") {
      const value = argv[index + 1];
      index += 1;
      const number = Number(value);
      if (!value || !Number.isInteger(number) || number < 1) {
        return {
          ok: false,
          error:
            arg === "--count"
              ? "Pass a chapter count, for example --count 5."
              : "Add the novel id, for example --draft 62 or --publish 62.",
        };
      }
      if (arg === "--count") {
        count = number;
        continue;
      }
      if (mode !== "file") return { ok: false, error: "Choose either --draft or --publish." };
      mode = arg === "--draft" ? "draft" : "publish";
      novelId = number;
      continue;
    }
    if (arg.startsWith("--")) return { ok: false, error: `Unknown option ${arg}.` };
    if (url) return { ok: false, error: "Pass one chapter URL." };
    url = arg;
  }
  if (!url) return { ok: false, error: "Pass a chapter URL." };
  return { ok: true, url, count, mode, novelId };
}
