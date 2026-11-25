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
    <form action={formAction}>
      <input type="hidden" name="novelId" value={novelId} />
      <label>
        Source{" "}
        <input name="source" value={sourceValue} onChange={(event) => setSourceValue(event.target.value)} required />
      </label>
      <label>
        Burmese{" "}
        <input
          name="burmese"
          value={burmeseValue}
          onChange={(event) => setBurmeseValue(event.target.value)}
          required
        />
      </label>
      <label>
        Note{" "}
        <input name="note" value={noteValue} onChange={(event) => setNoteValue(event.target.value)} />
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit">Add term</button>
    </form>
  );
}
