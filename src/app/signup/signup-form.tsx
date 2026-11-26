"use client";

import { useActionState } from "react";
import { signUpAction, type FormState } from "@/auth/actions";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, null as FormState);
  return (
    <form className="auth-form" action={action}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Enter your password"
          minLength={8}
          required
        />
      </div>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button className="btn" type="submit">
        Sign up
      </button>
    </form>
  );
}
