"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/controllers/auth";
import type { GenreRecord } from "@/services/novels/genre";
import { addGenreAdminAction, deleteGenreAdminAction, moveGenreAdminAction, updateGenreAdminAction } from "@/controllers/admin/genres";

export type AdminGenre = GenreRecord & { novels: number };

export function GenreAdmin({ genres }: { genres: AdminGenre[] }) {
  const [addState, addAction] = useActionState(addGenreAdminAction, null as FormState);
  const [editing, setEditing] = useState<number | null>(null);
  return (
    <>
      <section className="panel">
        <h2>Add a genre</h2>
        <form action={addAction}>
          <div className="split">
          <div className="field">
            <label htmlFor="genre-name">Name</label>
            <input id="genre-name" name="label" placeholder="e.g. Thriller" required />
          </div>
          <div className="field">
            <label htmlFor="genre-slug">Slug</label>
            <input id="genre-slug" name="slug" placeholder="thriller" required />
          </div>
          <div className="field">
            <label htmlFor="genre-burmese">Burmese</label>
            <input id="genre-burmese" name="labelMy" placeholder="သမိုင်း" required />
          </div>
          </div>
          <button className="btn" type="submit">
            Add genre
          </button>
        </form>
        {addState?.error ? <p className="error">{addState.error}</p> : null}
        <span className="hint">The slug is used in links, like /genre/thriller. Readers see the Burmese name.</span>
      </section>
      <div className="user-table">
        <div className="user-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Name</th>
                <th scope="col">Slug</th>
                <th scope="col">Novels</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {genres.map((genre, index) => (
                <tr key={genre.id}>
                  <td>
                    <form action={moveGenreAdminAction}>
                      <input type="hidden" name="id" value={genre.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button className="nudge" type="submit" aria-label={`Move ${genre.label} up`} disabled={index === 0}>
                        ▲
                      </button>
                    </form>
                    <form action={moveGenreAdminAction}>
                      <input type="hidden" name="id" value={genre.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        className="nudge"
                        type="submit"
                        aria-label={`Move ${genre.label} down`}
                        disabled={index === genres.length - 1}
                      >
                        ▼
                      </button>
                    </form>
                  </td>
                  <td>
                    <b>{genre.label}</b>
                  </td>
                  <td>{genre.slug}</td>
                  <td>{genre.novels}</td>
                  <td>
                    <div className="genre-actions">
                      <button className="btn2" type="button" aria-label={`Edit ${genre.label}`} onClick={() => setEditing(genre.id)}>
                        Edit
                      </button>
                      <form action={deleteGenreAdminAction}>
                        <input type="hidden" name="id" value={genre.id} />
                        <button
                          className="btn2 danger"
                          type="submit"
                          disabled={genre.novels > 0}
                          aria-label={genre.novels > 0 ? `Delete ${genre.label} (in use)` : `Delete ${genre.label}`}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editing ? <EditGenre genre={genres.find((genre) => genre.id === editing) ?? null} onClose={() => setEditing(null)} /> : null}
      <p className="hint">Genres that have novels can’t be deleted. Move those novels to another genre first.</p>
    </>
  );
}

function EditGenre({ genre, onClose }: { genre: AdminGenre | null; onClose: () => void }) {
  const [state, action] = useActionState(updateGenreAdminAction, null as FormState);
  if (!genre) return null;
  return (
    <section className="panel">
      <h2>Edit {genre.label}</h2>
      <form action={action}>
        <input type="hidden" name="id" value={genre.id} />
        <div className="split">
        <div className="field">
          <label htmlFor="edit-name">Name</label>
          <input id="edit-name" name="label" defaultValue={genre.label} required />
        </div>
        <div className="field">
          <label htmlFor="edit-burmese">Burmese</label>
          <input id="edit-burmese" name="labelMy" defaultValue={genre.labelMy} required />
        </div>
        </div>
        <p className="hint">Slug stays {genre.slug}.</p>
        <button className="btn" type="submit">
          Save
        </button>
        <button className="btn2" type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
      {state?.error ? <p className="error">{state.error}</p> : null}
    </section>
  );
}
