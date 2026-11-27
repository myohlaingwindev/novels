"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/controllers/auth";
import { grabChapterAction } from "@/controllers/write";

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
  const [url, setUrl] = useState("");
  const [grabbing, setGrabbing] = useState(false);
  const [grabError, setGrabError] = useState("");
  const [grabNotice, setGrabNotice] = useState("");
  async function grab() {
    setGrabbing(true);
    setGrabError("");
    setGrabNotice("");
    try {
      const result = await grabChapterAction(novelId, url);
      console.log("[grab]", result);
      if (!result.ok) {
        setGrabError(result.error);
        return;
      }
      setTitleValue((current) => (current.trim() === "" ? result.title : current));
      setBodyValue((current) => (current.trim() === "" ? result.body : current));
      setGrabNotice(result.notices.join(" "));
    } finally {
      setGrabbing(false);
    }
  }
  return (
    <form action={formAction}>
      <section className="panel">
        <input type="hidden" name="novelId" value={novelId} />
        {chapterId !== undefined ? <input type="hidden" name="chapterId" value={chapterId} /> : null}
        <div className="field">
          <label htmlFor="chapter-source-url">Source page</label>
          <input
            id="chapter-source-url"
            type="text"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (!grabbing) void grab();
            }}
            placeholder="https://"
          />
          <div className="publish-actions">
            <button className="btn2" type="button" onClick={grab} disabled={grabbing}>
              Grab
            </button>
          </div>
          {grabError ? <p className="error">{grabError}</p> : null}
          {grabNotice ? <span className="hint">{grabNotice}</span> : null}
        </div>
        <div className="split">
          <div className="field">
            <label htmlFor="chapter-title">Chapter title</label>
            <input
              id="chapter-title"
              name="title"
              value={titleValue}
              onChange={(event) => setTitleValue(event.target.value)}
              placeholder="Enter a chapter title"
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
