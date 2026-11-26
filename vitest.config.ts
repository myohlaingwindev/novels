import path from "node:path";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vitest/config";

const wasmPrefix = "\0prisma-wasm:";

function prismaWasmModule(): Plugin {
  return {
    name: "prisma-wasm-module",
    enforce: "pre",
    resolveId(source, importer) {
      if (source.startsWith(wasmPrefix)) return source;
      if (!source.includes(".wasm") || !importer || importer.startsWith(wasmPrefix)) return null;
      const file = path.resolve(path.dirname(importer), source.split("?")[0]);
      return wasmPrefix + file;
    },
    load(id) {
      if (!id.startsWith(wasmPrefix)) return null;
      const encoded = readFileSync(id.slice(wasmPrefix.length)).toString("base64");
      return `const bytes = Uint8Array.from(atob(${JSON.stringify(encoded)}), (char) => char.charCodeAt(0));
export default new WebAssembly.Module(bytes);
`;
    },
  };
}

export default defineConfig({
  plugins: [prismaWasmModule()],
  test: { environment: "node", fileParallelism: false },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
