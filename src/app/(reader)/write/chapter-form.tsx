"use client";

import { useActionState } from "react";
import type { FormState } from "@/auth/actions";

export function ChapterForm({
  action,
  novelId,
  chapterId,
  title,
  body,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  novelId: number;
  chapterId?: number;
  title: string;
  body: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null as FormState);
  return (
    <form action={formAction}>
      <input type="hidden" name="novelId" value={novelId} />
      {chapterId !== undefined ? <input type="hidden" name="chapterId" value={chapterId} /> : null}
      <label>
        Title <input name="title" defaultValue={title} required />
      </label>
      <label>
        Chapter text <textarea name="body" defaultValue={body} required />
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
