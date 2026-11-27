import Link from "next/link";
import { Cover } from "@/components/reading/cover-card";
import { CreditLines } from "@/components/reading/credit-lines";
import { readingPercent } from "@/services/reading/progress";

export function ContinueCard({
  novel,
  actionLabel = "Resume reading",
}: {
  novel: {
    slug: string;
    title: string;
    authorName: string;
    originAuthor: string;
    continueNumber: number;
    continuePosition: number;
    chapterCount: number;
  };
  actionLabel?: string;
}) {
  const percent = readingPercent(novel.continuePosition, novel.chapterCount);
  return (
    <div className="continue-card">
      <div className="continue-cover">
        <Cover slug={novel.slug} title={novel.title} size="small" />
      </div>
      <div className="continue-copy">
        <div className="continue-title">{novel.title}</div>
        <div className="continue-meta">
          <CreditLines originAuthor={novel.originAuthor} penName={novel.authorName} />
          <div>
            Chapter {novel.continuePosition} of {novel.chapterCount}
          </div>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Reading progress"
        >
          <div style={{ width: `${percent}%` }} />
        </div>
      </div>
      <Link className="btn" href={`/novels/${novel.slug}/chapters/${novel.continueNumber}`}>
        {actionLabel}
      </Link>
    </div>
  );
}
