"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createWeeklyTarget, type TargetFormState } from "./actions";

const initialState: TargetFormState = {};

export function TargetForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(
    createWeeklyTarget,
    initialState,
  );

  return (
    <form action={action} className="settings-form">
      <label className="field">
        <span>Активность</span>
        <input
          name="name"
          placeholder="Например, тренировка"
          required
          maxLength={80}
          disabled={disabled}
        />
      </label>
      <label className="field target-number-field">
        <span>Сессий</span>
        <input
          name="targetSessions"
          type="number"
          min={1}
          max={20}
          defaultValue={2}
          required
          disabled={disabled}
        />
      </label>
      <button
        className="primary-button compact"
        type="submit"
        disabled={disabled || pending}
      >
        <Plus size={16} />
        {pending ? "Добавляем…" : "Добавить"}
      </button>
      {state.error ? (
        <p className="form-message error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="form-message success" aria-live="polite">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
