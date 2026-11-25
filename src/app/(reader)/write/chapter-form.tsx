"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/auth/actions";

export function ChapterForm({
  action,
  novelId,
  chapterId,
  title,
  body,
  titleMy,
  bodyMy,
  hidden,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  novelId: number;
  chapterId?: number;
  title: string;
  body: string;
  titleMy: string;
  bodyMy: string;
  hidden: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null as FormState);
  const [titleValue, setTitleValue] = useState(title);
  const [bodyValue, setBodyValue] = useState(body);
  const [titleMyValue, setTitleMyValue] = useState(titleMy);
  const [bodyMyValue, setBodyMyValue] = useState(bodyMy);
  const [hiddenValue, setHiddenValue] = useState(hidden);
  return (
    <form action={formAction}>
      <input type="hidden" name="novelId" value={novelId} />
      {chapterId !== undefined ? <input type="hidden" name="chapterId" value={chapterId} /> : null}
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
        Chapter text{" "}
        <textarea
          name="body"
          value={bodyValue}
          onChange={(event) => setBodyValue(event.target.value)}
          required
        />
      </label>
      <label>
        Burmese title{" "}
        <input
          name="titleMy"
          value={titleMyValue}
          onChange={(event) => setTitleMyValue(event.target.value)}
        />
      </label>
      <label>
        Burmese chapter text{" "}
        <textarea
          name="bodyMy"
          value={bodyMyValue}
          onChange={(event) => setBodyMyValue(event.target.value)}
        />
      </label>
      <label>
        Hidden from library{" "}
        <input
          type="checkbox"
          name="hidden"
          value="true"
          checked={hiddenValue}
          onChange={(event) => setHiddenValue(event.target.checked)}
        />
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
