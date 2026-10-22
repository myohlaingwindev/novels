"use client";

import { useActionState } from "react";
import { logInAction, type FormState } from "@/auth/actions";

export function LoginForm() {
  const [state, action] = useActionState(logInAction, null as FormState);
  return (
    <form action={action}>
      <label>
        Email <input name="email" type="email" required />
      </label>
      <label>
        Password <input name="password" type="password" required />
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit">Log in</button>
    </form>
  );
}
