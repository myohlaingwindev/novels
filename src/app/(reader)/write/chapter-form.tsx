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
      <section className="panel">
        <input type="hidden" name="novelId" value={novelId} />
        {chapterId !== undefined ? <input type="hidden" name="chapterId" value={chapterId} /> : null}
        <div className="split">
          <div className="field">
            <label htmlFor="chapter-title">Chapter title</label>
            <input
              id="chapter-title"
              name="title"
              value={titleValue}
              onChange={(event) => setTitleValue(event.target.value)}
              placeholder="Enter a chapter title"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="chapter-title-my">Burmese title</label>
            <input
              id="chapter-title-my"
              name="titleMy"
              value={titleMyValue}
              onChange={(event) => setTitleMyValue(event.target.value)}
              placeholder="The title readers see"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="chapter-body">Chapter text</label>
          <textarea
            id="chapter-body"
            name="body"
            value={bodyValue}
            onChange={(event) => setBodyValue(event.target.value)}
            placeholder="The English chapter, for your own notes"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="chapter-body-my">Burmese chapter text</label>
          <textarea
            id="chapter-body-my"
            name="bodyMy"
            value={bodyMyValue}
            onChange={(event) => setBodyMyValue(event.target.value)}
            placeholder="The chapter readers see"
          />
          <span className="hint">{bodyMyValue.trim() ? `${bodyMyValue.trim().split(/\s+/).length} words` : "0 words"}</span>
        </div>
        <fieldset className="field">
          <legend>Library</legend>
          <div className="choices">
            <label>
              <input type="radio" name="hidden" value="true" checked={hiddenValue} onChange={() => setHiddenValue(true)} />
              Draft
            </label>
            <label>
              <input type="radio" name="hidden" value="false" checked={!hiddenValue} onChange={() => setHiddenValue(false)} />
              In the library
            </label>
          </div>
        </fieldset>
        {state?.error ? <p className="error">{state.error}</p> : null}
        <div className="publish-actions">
          <button className="btn" type="submit">
            {submitLabel}
          </button>
        </div>
      </section>
    </form>
  );
}
