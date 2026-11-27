import { setFavoriteAction } from "@/controllers/favorites";

export function FavoriteButton({
  saved,
  novelId,
  slug,
}: {
  saved: boolean;
  novelId: number;
  slug: string;
}) {
  return (
    <form action={setFavoriteAction}>
      <input type="hidden" name="novelId" value={novelId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="saved" value={saved ? "false" : "true"} />
      <button
        className={saved ? "heart heart-on" : "heart"}
        type="submit"
        aria-pressed={saved}
        aria-label={saved ? "Remove from favorites" : "Add to favorites"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </button>
    </form>
  );
}
