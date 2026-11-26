import { coverColor } from "@/reading/cover";
import { CreditLines } from "@/reading/credit-lines";

export function Cover({
  slug,
  title,
  kicker,
  credit,
  size = "full",
}: {
  slug: string;
  title: string;
  kicker?: string;
  credit?: { originAuthor: string; authorName: string };
  size?: "full" | "small";
}) {
  return (
    <div className={size === "small" ? "cover cover-small" : "cover"} style={{ background: coverColor(slug) }}>
      {kicker ? <span className="cover-kicker">{kicker}</span> : null}
      <span className="cover-title">{title}</span>
      {credit ? (
        <div className="cover-by">
          <CreditLines originAuthor={credit.originAuthor} penName={credit.authorName} />
        </div>
      ) : null}
    </div>
  );
}
