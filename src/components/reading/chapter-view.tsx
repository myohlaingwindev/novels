export function ChapterArticle({
  title,
  body,
  className,
}: {
  title: string;
  body: string;
  className?: string;
}) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  return (
    <article lang="my" className={className}>
      <h1>{title}</h1>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </article>
  );
}

export function ChapterView({
  title,
  body,
  novelSlug,
  prevNumber,
  nextNumber,
  className,
}: {
  title: string;
  body: string;
  novelSlug: string;
  prevNumber: number | null;
  nextNumber: number | null;
  className?: string;
}) {
  return (
    <>
      <ChapterArticle title={title} body={body} className={className} />
      <nav className="chapter-nav" aria-label="Chapter navigation">
        {prevNumber !== null ? (
          <a className="btn2" href={`/novels/${novelSlug}/chapters/${prevNumber}`}>
            <span className="label-long">← Previous chapter</span>
            <span className="label-short">← Previous</span>
          </a>
        ) : (
          <span />
        )}
        {nextNumber !== null ? (
          <a className="btn" href={`/novels/${novelSlug}/chapters/${nextNumber}`}>
            <span className="label-long">Next chapter →</span>
            <span className="label-short">Next →</span>
          </a>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
