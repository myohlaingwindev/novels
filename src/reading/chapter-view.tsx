export function ChapterArticle({ title, body }: { title: string; body: string }) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  return (
    <article>
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
}: {
  title: string;
  body: string;
  novelSlug: string;
  prevNumber: number | null;
  nextNumber: number | null;
}) {
  return (
    <>
      {prevNumber !== null ? <a href={`/novels/${novelSlug}/chapters/${prevNumber}`}>Previous</a> : null}
      <ChapterArticle title={title} body={body} />
      {nextNumber !== null ? <a href={`/novels/${novelSlug}/chapters/${nextNumber}`}>Next</a> : null}
    </>
  );
}
