"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/auth/actions";
import { genreLabel } from "@/novels/genre-label";
import { coverColor } from "@/reading/cover";

export function NovelForm({
  action,
  id,
  title,
  description,
  titleMy,
  descriptionMy,
  sourceTitle,
  sourceContent,
  sourceAuthor,
  originAuthor,
  genre,
  genres,
  hidden,
  slug,
  authorName,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  id?: number;
  title: string;
  description: string;
  titleMy: string;
  descriptionMy: string;
  sourceTitle: string;
  sourceContent: string;
  sourceAuthor: string;
  originAuthor: string;
  genre: string;
  genres: { slug: string; label: string }[];
  hidden: boolean;
  slug?: string;
  authorName: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null as FormState);
  const [titleValue, setTitleValue] = useState(title);
  const [slugValue, setSlugValue] = useState(slug ?? "");
  const [descriptionValue, setDescriptionValue] = useState(description);
  const [titleMyValue, setTitleMyValue] = useState(titleMy);
  const [descriptionMyValue, setDescriptionMyValue] = useState(descriptionMy);
  const [sourceTitleValue, setSourceTitleValue] = useState(sourceTitle);
  const [sourceContentValue, setSourceContentValue] = useState(sourceContent);
  const [sourceAuthorValue, setSourceAuthorValue] = useState(sourceAuthor);
  const [originAuthorValue, setOriginAuthorValue] = useState(originAuthor);
  const [genreValue, setGenreValue] = useState(genre);
  const options = genres.some((item) => item.slug === genre) ? genres : [...genres, { slug: genre, label: genre }];
  const [hiddenValue, setHiddenValue] = useState(hidden);
  const previewTitle = titleMyValue.trim() || titleValue.trim() || "Your title";
  return (
    <form className="publish-form" action={formAction}>
      {id !== undefined ? <input type="hidden" name="id" value={id} /> : null}
      <section className="panel" aria-labelledby="novel-details">
        <h2 id="novel-details">Novel details</h2>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            value={titleValue}
            onChange={(event) => setTitleValue(event.target.value)}
            placeholder="Enter your novel's title"
          />
        </div>
        <div className="field">
          <label htmlFor="title-my">Burmese title</label>
          <input
            id="title-my"
            name="titleMy"
            value={titleMyValue}
            onChange={(event) => setTitleMyValue(event.target.value)}
            placeholder="The title readers see"
          />
        </div>
        {slug !== undefined ? (
          <div className="field">
            <label htmlFor="slug">Address</label>
            <input
              id="slug"
              name="slug"
              value={slugValue}
              onChange={(event) => setSlugValue(event.target.value)}
              placeholder="the-salt-archive"
              required
            />
            <span className="hint">Letters and numbers. This becomes the novel’s link.</span>
          </div>
        ) : null}
        <div className="split">
          <div className="field">
            <label htmlFor="genre">Genre</label>
            <select
              id="genre"
              name="genre"
              value={genreValue}
              onChange={(event) => setGenreValue(event.target.value)}
            >
              {options.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="field">
            <legend>Library</legend>
            <div className="choices">
              <label>
                <input type="radio" name="hidden" value="true" checked={hiddenValue} onChange={() => setHiddenValue(true)} />
                Draft
              </label>
              <label>
                <input
                  type="radio"
                  name="hidden"
                  value="false"
                  checked={!hiddenValue}
                  onChange={() => setHiddenValue(false)}
                />
                In the library
              </label>
            </div>
          </fieldset>
        </div>
        <div className="field">
          <label htmlFor="description">Synopsis</label>
          <textarea
            id="description"
            className="synopsis"
            name="description"
            value={descriptionValue}
            onChange={(event) => setDescriptionValue(event.target.value)}
            placeholder="The English synopsis for your own notes"
            rows={5}
          />
        </div>
        <div className="field">
          <label htmlFor="description-my">Burmese synopsis</label>
          <textarea
            id="description-my"
            className="synopsis"
            name="descriptionMy"
            value={descriptionMyValue}
            onChange={(event) => setDescriptionMyValue(event.target.value)}
            placeholder="What readers see on the novel page"
            rows={5}
          />
        </div>
        <div className="split">
          <div className="field">
            <label htmlFor="source-title">Title class</label>
            <input
              id="source-title"
              name="sourceTitle"
              value={sourceTitleValue}
              onChange={(event) => setSourceTitleValue(event.target.value)}
              placeholder=".text-2xl or .chapter-body .wtr-line"
            />
          </div>
          <div className="field">
            <label htmlFor="source-content">Content class</label>
            <input
              id="source-content"
              name="sourceContent"
              value={sourceContentValue}
              onChange={(event) => setSourceContentValue(event.target.value)}
              placeholder=".text-2xl or .chapter-body .wtr-line"
            />
          </div>
        </div>
        <div className="split">
          <div className="field">
            <label htmlFor="source-author">Author class</label>
            <input
              id="source-author"
              name="sourceAuthor"
              value={sourceAuthorValue}
              onChange={(event) => setSourceAuthorValue(event.target.value)}
              placeholder=".text-2xl or .chapter-body .wtr-line"
            />
          </div>
          <div className="field">
            <label htmlFor="origin-author">Original author</label>
            <input
              id="origin-author"
              name="originAuthor"
              value={originAuthorValue}
              onChange={(event) => setOriginAuthorValue(event.target.value)}
              placeholder="The original author"
            />
          </div>
        </div>
        {state?.error ? <p className="error">{state.error}</p> : null}
        <div className="publish-actions">
          <button className="btn" type="submit">
            {submitLabel}
          </button>
        </div>
      </section>
      <aside className="panel preview-card">
        <span className="kicker">Preview</span>
        <div className="preview-cover" style={{ background: coverColor(slugValue || titleValue || "novel") }}>
          <span>{genreLabel(options, genreValue)}</span>
          <b>{previewTitle}</b>
          <span>{authorName}</span>
        </div>
        <span className="hint">This is how your novel appears in the library. Readers see the Burmese title.</span>
      </aside>
    </form>
  );
}
