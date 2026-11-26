"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/auth/actions";
import type { GenreRecord } from "@/novels/genre";
import { addGenreAction, deleteGenreAction, updateGenreAction } from "./actions";

export function GenreManager({ genres }: { genres: GenreRecord[] }) {
  return (
    <section className="panel" aria-labelledby="genres">
      <h2 id="genres">Genres</h2>
      <p className="hint">Labels readers see when they filter the library. Renaming a genre keeps its address.</p>
      <AddGenreForm />
      {genres.length === 0 ? <p>No genres yet.</p> : null}
      <ul className="term-list">
        {genres.map((genre) => (
          <GenreRow key={genre.id} genre={genre} />
        ))}
      </ul>
    </section>
  );
}

function AddGenreForm() {
  const [state, formAction] = useActionState(addGenreAction, null as FormState);
  const [labelValue, setLabelValue] = useState("");
  const [burmeseValue, setBurmeseValue] = useState("");
  return (
    <form className="glossary-form genre-form" action={formAction}>
      <div className="field">
        <label htmlFor="genre-label">Label</label>
        <input
          id="genre-label"
          name="label"
          value={labelValue}
          onChange={(event) => setLabelValue(event.target.value)}
          placeholder="Historical"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="genre-burmese">Burmese</label>
        <input
          id="genre-burmese"
          name="labelMy"
          value={burmeseValue}
          onChange={(event) => setBurmeseValue(event.target.value)}
          placeholder="သမိုင်း"
          required
        />
      </div>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button className="btn" type="submit">
        Add genre
      </button>
    </form>
  );
}

function GenreRow({ genre }: { genre: GenreRecord }) {
  const [state, formAction] = useActionState(updateGenreAction, null as FormState);
  const [deleteState, deleteAction] = useActionState(deleteGenreAction, null as FormState);
  const [labelValue, setLabelValue] = useState(genre.label);
  const [burmeseValue, setBurmeseValue] = useState(genre.labelMy);
  const error = state?.error ?? deleteState?.error;
  return (
    <li>
      <form className="glossary-form genre-form" action={formAction}>
        <input type="hidden" name="id" value={genre.id} />
        <div className="field">
          <label className="sr" htmlFor={`genre-label-${genre.id}`}>
            Label
          </label>
          <input
            id={`genre-label-${genre.id}`}
            name="label"
            value={labelValue}
            onChange={(event) => setLabelValue(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="sr" htmlFor={`genre-burmese-${genre.id}`}>
            Burmese
          </label>
          <input
            id={`genre-burmese-${genre.id}`}
            name="labelMy"
            value={burmeseValue}
            onChange={(event) => setBurmeseValue(event.target.value)}
            required
          />
          <span className="hint">{genre.slug}</span>
        </div>
        <button className="btn" type="submit">
          Save
        </button>
      </form>
      <form action={deleteAction}>
        <input type="hidden" name="id" value={genre.id} />
        <button className="btn2" type="submit">
          Delete
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </li>
  );
}
