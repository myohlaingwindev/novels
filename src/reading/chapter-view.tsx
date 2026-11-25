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
      {prevNumber !== null ? <a href={`/novels/${novelSlug}/chapters/${prevNumber}`}>Previous</a> : null}
      <ChapterArticle title={title} body={body} className={className} />
      {nextNumber !== null ? <a href={`/novels/${novelSlug}/chapters/${nextNumber}`}>Next</a> : null}
    </>
  );
}
