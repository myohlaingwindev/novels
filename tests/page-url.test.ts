import { describe, expect, test } from "vitest";
import { publicPageUrl } from "@/novels/page-url";

describe("publicPageUrl", () => {
  test("accepts a public https URL", () => {
    expect(publicPageUrl(" https://example.com/chapter/1 ")?.href).toBe("https://example.com/chapter/1");
  });

  test("refuses local, private, and non-http URLs", () => {
    expect(publicPageUrl("http://localhost/a")).toBeNull();
    expect(publicPageUrl("http://app.localhost/a")).toBeNull();
    expect(publicPageUrl("http://metadata.google.internal/")).toBeNull();
    expect(publicPageUrl("http://127.0.0.1/")).toBeNull();
    expect(publicPageUrl("http://10.0.0.8/")).toBeNull();
    expect(publicPageUrl("http://192.168.1.9/")).toBeNull();
    expect(publicPageUrl("http://169.254.1.1/")).toBeNull();
    expect(publicPageUrl("http://[::1]/")).toBeNull();
    expect(publicPageUrl("http://user:pass@example.com/")).toBeNull();
    expect(publicPageUrl("file:///tmp/a.html")).toBeNull();
    expect(publicPageUrl("not a url")).toBeNull();
  });
});
