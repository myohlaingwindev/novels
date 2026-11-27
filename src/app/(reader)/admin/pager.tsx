import Link from "next/link";

export function Pager({
  page,
  pageSize,
  total,
  path,
  query,
  noun,
}: {
  page: number;
  pageSize: number;
  total: number;
  path: string;
  query: Record<string, string>;
  noun: string;
}) {
  if (total === 0) return null;
  const pages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  function href(next: number) {
    const params = new URLSearchParams(query);
    params.set("page", String(next));
    return `${path}?${params.toString()}`;
  }
  return (
    <nav className="pager" aria-label="Pages">
      <span>
        Showing {start}–{end} of {total} {noun}
      </span>
      <div>
        {page <= 1 ? (
          <span className="page-link" aria-disabled="true">
            ‹
          </span>
        ) : (
          <Link className="page-link" href={href(page - 1)} aria-label="Previous page">
            ‹
          </Link>
        )}
        {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
          <Link
            key={number}
            className="page-link"
            href={href(number)}
            aria-current={number === page ? "page" : undefined}
            aria-label={`Page ${number}`}
          >
            {number}
          </Link>
        ))}
        {page >= pages ? (
          <span className="page-link" aria-disabled="true">
            ›
          </span>
        ) : (
          <Link className="page-link" href={href(page + 1)} aria-label="Next page">
            ›
          </Link>
        )}
      </div>
    </nav>
  );
}
