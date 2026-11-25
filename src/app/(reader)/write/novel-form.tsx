"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/auth/actions";
import { genres, type Genre } from "@/novels/genre";

export function NovelForm({
  action,
  id,
  title,
  description,
  titleMy,
  descriptionMy,
  genre,
  hidden,
  slug,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  id?: number;
  title: string;
  description: string;
  titleMy: string;
  descriptionMy: string;
  genre: Genre;
  hidden: boolean;
  slug?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null as FormState);
  const [titleValue, setTitleValue] = useState(title);
  const [slugValue, setSlugValue] = useState(slug ?? "");
  const [descriptionValue, setDescriptionValue] = useState(description);
  const [titleMyValue, setTitleMyValue] = useState(titleMy);
  const [descriptionMyValue, setDescriptionMyValue] = useState(descriptionMy);
  const [genreValue, setGenreValue] = useState(genre);
  const [hiddenValue, setHiddenValue] = useState(hidden);
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
      {slug !== undefined ? (
        <label>
          Slug{" "}
          <input
            name="slug"
            value={slugValue}
            onChange={(event) => setSlugValue(event.target.value)}
            required
          />
        </label>
      ) : null}
      <label>
        Description{" "}
        <textarea
          name="description"
          value={descriptionValue}
          onChange={(event) => setDescriptionValue(event.target.value)}
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
        Burmese synopsis{" "}
        <textarea
          name="descriptionMy"
          value={descriptionMyValue}
          onChange={(event) => setDescriptionMyValue(event.target.value)}
        />
      </label>
      <label>
        Genre{" "}
        <select name="genre" value={genreValue} onChange={(event) => setGenreValue(event.target.value as Genre)}>
          {genres.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
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
