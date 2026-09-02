"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, LoaderCircle } from "lucide-react";
import type { AnchorSlotKey, ModeKey } from "@/lib/modes";
import { modeContent, modeOrder } from "@/lib/modes";
import {
  saveCheckIn,
  savePrimaryFocus,
  selectMode,
  toggleAnchor,
} from "./actions";

type DayState = {
  label: string;
  state: "done" | "partial" | "current" | "empty";
};
type Anchor = {
  slot: AnchorSlotKey;
  title: string;
  label: string;
  done: boolean;
};
type Target = { id: string; name: string; target: number; actual: number };

type Props = {
  dateLabel: string;
  energy: number | null;
  sleep: number | null;
  suggestedMode: ModeKey | null;
  selectedMode: ModeKey | null;
  manuallySelected: boolean;
  primaryFocus: string;
  anchorLabels: Record<ModeKey, Record<AnchorSlotKey, string>>;
  anchorDone: Record<AnchorSlotKey, boolean>;
  weekDays: DayState[];
  weekSuccessCount: number;
  weekOutcome: string | null;
  targets: Target[];
};

const anchorTitles: Record<AnchorSlotKey, string> = {
  FOCUS: "Фокус",
  BODY: "Тело",
  SHUTDOWN: "Закрытие",
};

export function TodayClient(props: Props) {
  const [energy, setEnergy] = useState(props.energy);
  const [sleep, setSleep] = useState(props.sleep);
  const [suggestedMode, setSuggestedMode] = useState(props.suggestedMode);
  const [selectedMode, setSelectedMode] = useState(props.selectedMode);
  const [manuallySelected, setManuallySelected] = useState(
    props.manuallySelected,
  );
  const [primaryFocus, setPrimaryFocus] = useState(props.primaryFocus);
  const [anchorDone, setAnchorDone] = useState(props.anchorDone);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const registration = context.registerTool(
      {
        name: "save_daily_check_in",
        title: "Сохранить утренний check-in",
        description:
          "Сохраняет оценки энергии и сна от 1 до 3 и обновляет предложенный режим текущего дня.",
        inputSchema: {
          type: "object",
          properties: {
            energy: { type: "integer", minimum: 1, maximum: 3 },
            sleep: { type: "integer", minimum: 1, maximum: 3 },
          },
          required: ["energy", "sleep"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input: unknown) {
          if (!input || typeof input !== "object")
            throw new Error("Некорректные данные check-in");
          const { energy: nextEnergy, sleep: nextSleep } = input as {
            energy?: unknown;
            sleep?: unknown;
          };
          if (
            ![1, 2, 3].includes(Number(nextEnergy)) ||
            ![1, 2, 3].includes(Number(nextSleep))
          ) {
            throw new Error("Энергия и сон должны быть числами от 1 до 3");
          }
          setStatus("saving");
          const result = await saveCheckIn({
            energy: Number(nextEnergy),
            sleep: Number(nextSleep),
          });
          setEnergy(Number(nextEnergy));
          setSleep(Number(nextSleep));
          setSuggestedMode(result.suggestedMode);
          setSelectedMode(result.selectedMode);
          setStatus("saved");
          return {
            saved: true,
            suggestedMode: result.suggestedMode,
            selectedMode: result.selectedMode,
          };
        },
      },
      { signal: lifecycle.signal },
    );

    void Promise.resolve(registration).catch(() => lifecycle.abort());
    return () => lifecycle.abort();
  }, []);

  const persistCheckIn = (
    nextEnergy: number | null,
    nextSleep: number | null,
  ) => {
    if (!nextEnergy || !nextSleep) return;
    setStatus("saving");
    startTransition(async () => {
      try {
        const result = await saveCheckIn({
          energy: nextEnergy,
          sleep: nextSleep,
        });
        setSuggestedMode(result.suggestedMode);
        setSelectedMode(result.selectedMode);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  };

  const chooseScore = (field: "energy" | "sleep", value: number) => {
    const nextEnergy = field === "energy" ? value : energy;
    const nextSleep = field === "sleep" ? value : sleep;
    if (field === "energy") setEnergy(value);
    else setSleep(value);
    persistCheckIn(nextEnergy, nextSleep);
  };

  const chooseMode = (mode: ModeKey) => {
    if (!selectedMode) return;
    const previous = selectedMode;
    setSelectedMode(mode);
    setManuallySelected(true);
    setStatus("saving");
    startTransition(async () => {
      try {
        await selectMode({ mode });
        setStatus("saved");
      } catch {
        setSelectedMode(previous);
        setStatus("error");
      }
    });
  };

  const setDone = (slot: AnchorSlotKey) => {
    if (!selectedMode) return;
    const done = !anchorDone[slot];
    setAnchorDone((current) => ({ ...current, [slot]: done }));
    setStatus("saving");
    startTransition(async () => {
      try {
        await toggleAnchor({ slot, done });
        setStatus("saved");
      } catch {
        setAnchorDone((current) => ({ ...current, [slot]: !done }));
        setStatus("error");
      }
    });
  };

  const persistFocus = () => {
    if (!selectedMode) return;
    setStatus("saving");
    startTransition(async () => {
      try {
        await savePrimaryFocus({ value: primaryFocus });
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  };

  const anchors: Anchor[] = selectedMode
    ? (["FOCUS", "BODY", "SHUTDOWN"] as AnchorSlotKey[]).map((slot) => ({
        slot,
        title: anchorTitles[slot],
        label: props.anchorLabels[selectedMode][slot],
        done: anchorDone[slot],
      }))
    : [];
  const completed = Object.values(anchorDone).filter(Boolean).length;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">{props.dateLabel}</p>
          <h1>Доброе утро</h1>
          <p className="subtitle">
            Выбери нагрузку по состоянию — и сохрани ритм.
          </p>
        </div>
        <div className={`save-status ${status}`} aria-live="polite">
          {status === "saving" ? (
            <>
              <LoaderCircle size={13} className="spin" />
              Сохраняем
            </>
          ) : null}
          {status === "saved" ? (
            <>
              <Check size={13} />
              Сохранено
            </>
          ) : null}
          {status === "error" ? "Не удалось сохранить" : null}
        </div>
      </header>

      <div className="content-grid">
        <div>
          <section
            className="card checkin-card"
            aria-labelledby="checkin-title"
          >
            <div>
              <p className="section-kicker">Утренний check-in</p>
              <h2 id="checkin-title">Как ты сегодня?</h2>
              <p className="small-copy">
                Два быстрых ответа определят подходящую нагрузку.
              </p>
            </div>
            {(["energy", "sleep"] as const).map((field) => {
              const current = field === "energy" ? energy : sleep;
              return (
                <div className="scale-group" key={field}>
                  <label>{field === "energy" ? "Энергия" : "Сон"}</label>
                  <div className="scale">
                    {[1, 2, 3].map((value) => (
                      <button
                        type="button"
                        className={current === value ? "selected" : ""}
                        onClick={() => chooseScore(field, value)}
                        key={value}
                        aria-pressed={current === value}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          <section
            className={`card mode-card mode-${selectedMode ? modeContent[selectedMode].tone : "empty"}`}
            aria-labelledby="mode-title"
          >
            <div className="mode-row">
              <div>
                <p className="section-kicker">
                  {selectedMode
                    ? `Режим дня · ${manuallySelected ? "выбран вручную" : suggestedMode ? "предложен системой" : "выбран"}`
                    : "Режим дня"}
                </p>
                <h2 id="mode-title">
                  {selectedMode
                    ? modeContent[selectedMode].title
                    : "Сначала оцени состояние"}
                </h2>
                <p className="small-copy">
                  {selectedMode
                    ? `${modeContent[selectedMode].description} Все три опоры — полноценный успех.`
                    : "После двух ответов здесь появится подходящий контракт на день."}
                </p>
              </div>
              <div className="mode-switcher" aria-label="Выбрать режим дня">
                {modeOrder.map((mode) => (
                  <button
                    type="button"
                    className={selectedMode === mode ? "active" : ""}
                    title={modeContent[mode].title}
                    disabled={!selectedMode}
                    onClick={() => chooseMode(mode)}
                    key={mode}
                  >
                    {modeContent[mode].short}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section
            className="card anchors-card"
            aria-labelledby="anchors-title"
          >
            <div className="section-head">
              <div>
                <p className="section-kicker">План на сегодня</p>
                <h2 id="anchors-title">Три опоры дня</h2>
                <p className="small-copy">
                  Не список привычек — короткий контракт с собой.
                </p>
              </div>
              <span
                className={`progress-pill ${completed === 3 ? "complete" : ""}`}
              >
                {completed} из 3
              </span>
            </div>

            {selectedMode ? (
              <>
                <label className="focus-field">
                  <span>Главная задача</span>
                  <input
                    value={primaryFocus}
                    onChange={(event) => setPrimaryFocus(event.target.value)}
                    onBlur={persistFocus}
                    placeholder="Что важно продвинуть сегодня?"
                    maxLength={180}
                  />
                </label>
                <div className="anchor-list">
                  {anchors.map((anchor, index) => (
                    <button
                      className={`anchor ${anchor.done ? "done" : ""}`}
                      type="button"
                      onClick={() => setDone(anchor.slot)}
                      aria-pressed={anchor.done}
                      key={anchor.slot}
                    >
                      <span className="anchor-icon">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <span className="anchor-title">{anchor.title}</span>
                        <span className="anchor-copy">{anchor.label}</span>
                      </span>
                      <span className="check-circle" aria-hidden="true">
                        {anchor.done ? <Check size={15} /> : null}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                Отметь энергию и сон — опоры подстроятся под твой сегодняшний
                ресурс.
              </div>
            )}
          </section>
        </div>

        <aside className="side-stack">
          <section className="card week-card" aria-labelledby="week-title">
            <p className="section-kicker">Текущая неделя</p>
            <h2 id="week-title">{props.weekOutcome || "Ритм важнее серии"}</h2>
            <div className="week-summary">
              <strong>{props.weekSuccessCount}</strong>
              <span>
                успешных дня
                <br />
                из 7
              </span>
            </div>
            <div className="week-days" aria-label="Прогресс текущей недели">
              {props.weekDays.map((day) => (
                <div className={`day ${day.state}`} key={day.label}>
                  {day.label}
                </div>
              ))}
            </div>
          </section>

          {props.targets.length ? (
            <section className="card targets-card">
              <p className="section-kicker">Недельные цели</p>
              <h2>Сессии, не серии</h2>
              <div className="target-list">
                {props.targets.map((target) => (
                  <div className="target-row" key={target.id}>
                    <span>{target.name}</span>
                    <strong>
                      {target.actual} / {target.target}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card principle-card">
            <div className="quote-mark">“</div>
            <p>
              Минимум — это не слабый день. Это умный способ не выпадать из
              системы.
            </p>
            <span>Принцип недели</span>
          </section>
        </aside>
      </div>
    </>
  );
}
