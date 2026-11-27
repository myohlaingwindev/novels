"use client";

import { useActionState } from "react";
import type { FormState } from "@/controllers/auth";
import type { CreditRules } from "@/services/credits/ledger";
import { adjustCreditsAction, saveRulesAction } from "@/controllers/admin/credits";

export function CreditForms({ rules }: { rules: CreditRules }) {
  const [rulesState, saveRules] = useActionState(saveRulesAction, null as FormState);
  const [adjustState, adjust] = useActionState(adjustCreditsAction, null as FormState);
  return (
    <div className="admin-grid">
      <section className="panel">
        <h2>Credit rules</h2>
        <form action={saveRules}>
          <div className="split">
            <div className="field">
              <label htmlFor="daily-free">Daily free credits</label>
              <input id="daily-free" name="dailyFree" type="number" min={0} defaultValue={rules.dailyFree} required />
            </div>
            <div className="field">
              <label htmlFor="chapter-price">Price per chapter</label>
              <input id="chapter-price" name="chapterPrice" type="number" min={0} defaultValue={rules.chapterPrice} required />
            </div>
          </div>
          <div className="split">
            <div className="field">
              <label htmlFor="free-chapters">Free chapters per novel</label>
              <input id="free-chapters" name="freeChapters" type="number" min={0} defaultValue={rules.freeChapters} required />
            </div>
            <div className="field">
              <label htmlFor="reset-time">Daily reset time</label>
              <input id="reset-time" name="resetLabel" defaultValue={rules.resetLabel} required />
            </div>
          </div>
          {rulesState?.error ? <p className="error">{rulesState.error}</p> : null}
          <button className="btn" type="submit">
            Save rules
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Adjust a user’s credits</h2>
        <form action={adjust}>
          <div className="field">
            <label htmlFor="user-email">User email</label>
            <input id="user-email" name="email" type="email" placeholder="Search by email" required />
          </div>
          <div className="split">
            <div className="field">
              <label htmlFor="amount">Amount</label>
              <input id="amount" name="amount" type="number" placeholder="Use − to remove, e.g. −3" required />
            </div>
            <div className="field grow">
              <label htmlFor="reason">Reason (required)</label>
              <textarea id="reason" className="short-note" name="reason" rows={2} placeholder="Why are you changing this balance?" required />
            </div>
          </div>
          {adjustState?.error ? <p className="error">{adjustState.error}</p> : null}
          <button className="btn" type="submit">
            Apply adjustment
          </button>
        </form>
      </section>
    </div>
  );
}
