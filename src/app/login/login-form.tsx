"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="login-form">
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="field">
        <span>Логин</span>
        <input name="username" autoComplete="username" required autoFocus />
      </label>
      <label className="field">
        <span>Пароль</span>
        <span className="password-field">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>
      {state.error ? (
        <p className="login-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className="primary-button" type="submit" disabled={pending}>
        <LockKeyhole size={17} />
        {pending ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
