import { describe, expect, test } from "vitest";
import { clearMemoryCache, forget, remember } from "@/db/memory-cache";

describe("remember", () => {
  test("reuses a value until it is forgotten", async () => {
    clearMemoryCache();
    let loads = 0;
    const load = async () => {
      loads += 1;
      return "catalog";
    };
    expect(await remember("library", 60_000, load)).toBe("catalog");
    expect(await remember("library", 60_000, load)).toBe("catalog");
    expect(loads).toBe(1);
    forget("library");
    expect(await remember("library", 60_000, load)).toBe("catalog");
    expect(loads).toBe(2);
  });

  test("does not keep a value that expired", async () => {
    clearMemoryCache();
    let loads = 0;
    const load = async () => {
      loads += 1;
      return loads;
    };
    expect(await remember("genres", 0, load)).toBe(1);
    expect(await remember("genres", 0, load)).toBe(2);
  });
});
