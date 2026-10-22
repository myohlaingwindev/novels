"use client";

import { useActionState } from "react";
import type { FormState } from "@/auth/actions";

export function NovelForm({
  action,
  id,
  title,
  description,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  id?: number;
  title: string;
  description: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null as FormState);
  return (
    <form action={formAction}>
      {id !== undefined ? <input type="hidden" name="id" value={id} /> : null}
      <label>
        Title <input name="title" defaultValue={title} required />
      </label>
      <label>
        Description <textarea name="description" defaultValue={description} />
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
