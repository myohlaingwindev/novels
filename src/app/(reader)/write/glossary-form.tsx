"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/auth/actions";
import { addGlossaryAction } from "./actions";

export function GlossaryForm({ novelId }: { novelId: number }) {
  const [state, formAction] = useActionState(addGlossaryAction, null as FormState);
  const [sourceValue, setSourceValue] = useState("");
  const [burmeseValue, setBurmeseValue] = useState("");
  const [noteValue, setNoteValue] = useState("");
  return (
    <form className="glossary-form" action={formAction}>
      <input type="hidden" name="novelId" value={novelId} />
      <div className="field">
        <label htmlFor="glossary-source">Source</label>
        <input
          id="glossary-source"
          name="source"
          value={sourceValue}
          onChange={(event) => setSourceValue(event.target.value)}
          placeholder="sect"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="glossary-burmese">Burmese</label>
        <input
          id="glossary-burmese"
          name="burmese"
          value={burmeseValue}
          onChange={(event) => setBurmeseValue(event.target.value)}
          placeholder="ဂိုဏ်း"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="glossary-note">Note</label>
        <input
          id="glossary-note"
          name="note"
          value={noteValue}
          onChange={(event) => setNoteValue(event.target.value)}
          placeholder="Optional"
        />
      </div>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button className="btn" type="submit">
        Add term
      </button>
    </form>
  );
}
