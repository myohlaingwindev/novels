"use client";

import { useActionState } from "react";
import { signUpAction, type FormState } from "@/auth/actions";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, null as FormState);
  return (
    <form action={action}>
      <label>
        Email <input name="email" type="email" required />
      </label>
      <label>
        Password <input name="password" type="password" minLength={8} required />
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit">Sign up</button>
    </form>
  );
}
