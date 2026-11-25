import { NovelForm } from "../novel-form";
import { createNovelAction } from "../actions";

export default function NewNovelPage() {
  return (
    <main>
      <h1>New novel</h1>
      <NovelForm
        action={createNovelAction}
        title=""
        description=""
        titleMy=""
        descriptionMy=""
        genre="xianxia"
        hidden
        slug=""
        submitLabel="Create novel"
      />
    </main>
  );
}
