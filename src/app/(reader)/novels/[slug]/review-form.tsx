"use client";

import { useActionState } from "react";
import type { FormState } from "@/controllers/auth";

export function ReviewForm({
  action,
  novelId,
  rating,
  body,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  novelId: number;
  rating: number;
  body: string;
}) {
  const [state, formAction] = useActionState(action, null as FormState);
  return (
    <form className="review-form" action={formAction}>
      <input type="hidden" name="novelId" value={novelId} />
      <div className="field">
        <label htmlFor="rating">Your rating</label>
        <select id="rating" name="rating" defaultValue={rating > 0 ? String(rating) : "5"}>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="review-body">Review</label>
        <textarea id="review-body" name="body" defaultValue={body} rows={4} placeholder="What stayed with you?" />
      </div>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button className="btn" type="submit">
        {rating > 0 ? "Update review" : "Save review"}
      </button>
    </form>
  );
}
