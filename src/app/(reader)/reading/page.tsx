import Link from "next/link";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { ContinueCard } from "@/reading/continue-card";
import { novelsStillReading } from "@/reading/progress";
import { listNovelsForLibrary } from "@/reading/reading";

export default async function ContinueReadingPage() {
  const user = await requireUser();
  const reading = novelsStillReading(await listNovelsForLibrary(await getDatabase(), user.id));

  return (
    <main className="library">
      <h1>Continue reading</h1>
      <p className="reading-lede">Every novel you have already started, with the one you opened last at the top.</p>
      {reading.length === 0 ? (
        <p>
          You have not started a novel yet. <Link href="/">Browse the library</Link>.
        </p>
      ) : (
        <div className="continue-list">
          {reading.map((novel) => (
            <ContinueCard key={novel.id} novel={novel} />
          ))}
        </div>
      )}
    </main>
  );
}
