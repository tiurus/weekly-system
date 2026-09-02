import { Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTodayContext } from "@/lib/today";
import { deleteWeeklyTarget, saveWeekOutcome } from "./actions";
import { TargetForm } from "./target-form";

export default async function SettingsPage() {
  const user = await requireUser();
  const context = await getTodayContext(user.id, user.timezone);

  return (
    <section className="settings-page">
      <header>
        <p className="eyebrow">Настройки текущей недели</p>
        <h1>Твоя система</h1>
        <p className="subtitle">
          Оставь только то, что действительно важно удерживать сейчас.
        </p>
      </header>

      <div className="settings-grid">
        <section className="card settings-card">
          <p className="section-kicker">Главный результат</p>
          <h2>Один ориентир недели</h2>
          <form action={saveWeekOutcome} className="outcome-form">
            <input
              name="outcome"
              defaultValue={context.week.mainOutcome ?? ""}
              placeholder="Что должно заметно продвинуться?"
              maxLength={180}
            />
            <button className="secondary-button" type="submit">
              Сохранить
            </button>
          </form>
        </section>

        <section className="card settings-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Недельные цели</p>
              <h2>До трёх активностей</h2>
              <p className="small-copy">
                Считаем реальные сессии, а не ежедневную серию.
              </p>
            </div>
            <span className="progress-pill">
              {context.week.targets.length} из 3
            </span>
          </div>

          <div className="settings-target-list">
            {context.week.targets.map((target) => (
              <div className="settings-target" key={target.id}>
                <span>
                  <strong>{target.name}</strong>
                  <small>Цель: {target.targetSessions} сесс.</small>
                </span>
                <form action={deleteWeeklyTarget}>
                  <input type="hidden" name="id" value={target.id} />
                  <button
                    type="submit"
                    aria-label={`Удалить цель ${target.name}`}
                    title="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                </form>
              </div>
            ))}
          </div>
          <TargetForm disabled={context.week.targets.length >= 3} />
        </section>
      </div>
    </section>
  );
}
