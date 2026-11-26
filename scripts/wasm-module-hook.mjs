import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

if (!process.env.PRISMA_WASM_HOOK) {
  process.env.PRISMA_WASM_HOOK = "1";
  register(import.meta.url, { parentURL: import.meta.url });
}

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.includes(".wasm")) return nextResolve(specifier, context);
  const parent = context.parentURL ?? import.meta.url;
  const file = new URL(specifier.split("?")[0], parent);
  return { url: `${file.href}?module`, shortCircuit: true };
}

export async function load(url, context, nextLoad) {
  if (!url.includes(".wasm")) return nextLoad(url, context);
  const bytes = readFileSync(fileURLToPath(url.split("?")[0]));
  const encoded = Buffer.from(bytes).toString("base64");
  return {
    format: "module",
    shortCircuit: true,
    source: `const bytes = Uint8Array.from(atob(${JSON.stringify(encoded)}), (char) => char.charCodeAt(0));
export default new WebAssembly.Module(bytes);
`,
  };
}
