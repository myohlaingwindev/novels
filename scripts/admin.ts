import { openDatabase } from "@/db/client";
import { setAdminByEmail } from "@/auth/users";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run admin -- email@example.com");
  process.exit(1);
}

const db = openDatabase(process.env.DATABASE_PATH ?? "data/novels.db");
const result = setAdminByEmail(db, email);
if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}
console.log(`Admin set for ${result.email}`);
