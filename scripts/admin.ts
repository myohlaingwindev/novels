import { openScriptDatabase } from "@/db/script";
import { setAdminByEmail } from "@/services/auth/users";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run admin -- email@example.com");
  process.exit(1);
}

async function main() {
  const db = await openScriptDatabase();
  const result = await setAdminByEmail(db, email);
  await db.$disconnect();
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(`Admin set for ${result.email}`);
}

void main();
