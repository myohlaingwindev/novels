import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".open-next");
const marker = "async function loadWasmChunk";

function functionEnd(text, start) {
  const open = text.indexOf("{", start);
  if (open < 0) throw new Error("WASM loader is missing its body");
  let depth = 0;
  let quote = null;
  let escape = false;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  throw new Error("WASM loader body is unbalanced");
}

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "node_modules" ? [] : filesUnder(full);
    return full.endsWith(".js") || full.endsWith(".mjs") ? [full] : [];
  });
}

let patched = 0;
for (const file of filesUnder(root)) {
  const text = readFileSync(file, "utf8");
  if (!text.includes(marker)) continue;
  let start = 0;
  let next = "";
  let cursor = 0;
  while (true) {
    const index = text.indexOf(marker, start);
    if (index < 0) {
      next += text.slice(cursor);
      break;
    }
    const end = functionEnd(text, index);
    const body = text.slice(index, end);
    const imports = [
      ...body.matchAll(
        /case\s*"([^"]*query_compiler_fast_bg[^"]*\.wasm)"\s*:\s*return\s*\(await import\("([^"]+)"\)\)\.default/g,
      ),
    ];
    const chosen = imports.find((match) => match[2].includes("src_generated_prisma")) ?? imports[0];
    if (!chosen) throw new Error(`No Prisma query compiler import in ${file}`);
    next += text.slice(cursor, index);
    next += `async function loadWasmChunk(chunkPath){switch(chunkPath){case"${chosen[1]}":return(await import("${chosen[2]}")).default;default:throw new Error(\`Unknown wasm chunk: \${chunkPath}\`)}}`;
    cursor = end;
    start = end;
    patched += 1;
  }
  writeFileSync(file, next);
}

if (patched === 0) throw new Error("No loadWasmChunk function was found in .open-next");
console.log(`Kept the Prisma query compiler in ${patched} WASM loader${patched === 1 ? "" : "s"}.`);
