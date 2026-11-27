import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "./args.ts";
import { runChapters } from "./run.ts";
import type { GlossaryPair } from "./translate.ts";

const args = parseArgs(process.argv.slice(2));
if (!args.ok) {
  console.error(args.error);
  process.exit(1);
}

loadEnv(path.resolve(".env"));
const glossary = readGlossary(path.resolve("glossary.json"));
const result = await runChapters({
  ...args,
  selectors: {
    title: process.env.TITLE_SELECTOR ?? "",
    content: process.env.CONTENT_SELECTOR ?? "",
    next: process.env.NEXT_SELECTOR ?? "",
  },
  glossary,
  apiKey: process.env.GEMINI_API_KEY ?? "",
  publishUrl: process.env.PUBLISH_URL ?? "",
  publishToken: process.env.PUBLISH_TOKEN ?? "",
  outputDir: path.resolve("output"),
});

if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}
for (const file of result.files) console.log(file);
if (args.mode === "draft") console.log(`Draft saved on novel ${args.novelId}.`);
if (args.mode === "publish") console.log(`Published on novel ${args.novelId}.`);

function loadEnv(file: string) {
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function readGlossary(file: string): GlossaryPair[] {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as { source?: unknown; burmese?: unknown };
    if (typeof record.source !== "string" || typeof record.burmese !== "string") return [];
    return [{ source: record.source, burmese: record.burmese }];
  });
}
