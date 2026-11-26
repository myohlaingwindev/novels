"use client";

import { useActionState } from "react";
import { logInAction, type FormState } from "@/auth/actions";

export function LoginForm() {
  const [state, action] = useActionState(logInAction, null as FormState);
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
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
      </div>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button className="btn" type="submit">
        Sign in
      </button>
    </form>
  );
}
