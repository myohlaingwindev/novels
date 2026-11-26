import { coverColor } from "@/reading/cover";

export function Cover({
  slug,
  title,
  kicker,
  byline,
  size = "full",
}: {
  slug: string;
  title: string;
  kicker?: string;
  byline?: string;
  size?: "full" | "small";
}) {
  return (
    <div className={size === "small" ? "cover cover-small" : "cover"} style={{ background: coverColor(slug) }}>
      {kicker ? <span className="cover-kicker">{kicker}</span> : null}
      <span className="cover-title">{title}</span>
      {byline ? <span className="cover-by">{byline}</span> : null}
    </div>
  );
}
