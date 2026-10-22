import { openDatabase } from "@/db/client";

export function testDb() {
  return openDatabase(":memory:");
}
