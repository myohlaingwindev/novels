"use client";

import { useActionState } from "react";
import type { FormState } from "@/auth/actions";
import type { PromotionRecord } from "@/credits/promotions";
import { savePromotionAction } from "./actions";

export function PromotionForm({ promotion }: { promotion: PromotionRecord | null }) {
  const [state, action] = useActionState(savePromotionAction, null as FormState);
  return (
    <section className="panel" id="promotion-form">
      <h2>{promotion ? "Edit promotion" : "New promotion"}</h2>
      <form action={action}>
        {promotion ? <input type="hidden" name="id" value={promotion.id} /> : null}
        <div className="field">
          <label htmlFor="promo-name">Name</label>
          <input id="promo-name" name="name" defaultValue={promotion?.name ?? ""} placeholder="e.g. Weekend bonus" required />
        </div>
        <div className="field">
          <label htmlFor="promo-type">Type</label>
          <select id="promo-type" name="kind" defaultValue={promotion?.kind ?? "bonus"}>
            <option value="bonus">Bonus credits</option>
            <option value="free">Free chapters</option>
            <option value="code">Promo code</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="promo-value">Value</label>
          <input id="promo-value" name="value" type="number" min={1} defaultValue={promotion?.value ?? ""} placeholder="e.g. 2" required />
        </div>
        <div className="field">
          <label htmlFor="promo-scope">Applies to</label>
          <select id="promo-scope" name="scope" defaultValue={promotion?.scope ?? "all"}>
            <option value="all">All novels</option>
            <option value="novel">One novel…</option>
          </select>
        </div>
        <div className="split">
          <div className="field">
            <label htmlFor="promo-start">Starts</label>
            <input id="promo-start" name="startsOn" type="date" defaultValue={promotion?.startsOn ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="promo-end">Ends</label>
            <input id="promo-end" name="endsOn" type="date" defaultValue={promotion?.endsOn ?? ""} />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" name="active" value="true" defaultChecked={promotion?.active ?? true} /> Active
        </label>
        {state?.error ? <p className="error">{state.error}</p> : null}
        <button className="btn" type="submit">
          Save promotion
        </button>
      </form>
    </section>
  );
}
