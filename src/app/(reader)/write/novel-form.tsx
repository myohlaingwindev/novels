"use client";

import { useActionState, useState } from "react";
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
  const [titleValue, setTitleValue] = useState(title);
  const [descriptionValue, setDescriptionValue] = useState(description);
  return (
    <form action={formAction}>
      {id !== undefined ? <input type="hidden" name="id" value={id} /> : null}
      <label>
        Title{" "}
        <input
          name="title"
          value={titleValue}
          onChange={(event) => setTitleValue(event.target.value)}
          required
        />
      </label>
      <label>
        Description{" "}
        <textarea
          name="description"
          value={descriptionValue}
          onChange={(event) => setDescriptionValue(event.target.value)}
        />
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
