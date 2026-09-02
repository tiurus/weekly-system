import { requireUser } from "@/lib/auth";
import { formatRussianDate, getWeekRange } from "@/lib/local-date";
import {
  defaultAnchors,
  type AnchorSlotKey,
  type ModeKey,
  modeOrder,
} from "@/lib/modes";
import { getTodayContext } from "@/lib/today";
import { TodayClient } from "./today-client";

export default async function TodayPage() {
  const user = await requireUser();
  const context = await getTodayContext(user.id, user.timezone);
  const slots: AnchorSlotKey[] = ["FOCUS", "BODY", "SHUTDOWN"];
  const anchorLabels = Object.fromEntries(
    modeOrder.map((mode) => [
      mode,
      Object.fromEntries(
        slots.map((slot) => {
          const stored = context.templates.find(
            (item) => item.mode === mode && item.slot === slot,
          );
          const fallback = defaultAnchors.find(
            (item) => item.mode === mode && item.slot === slot,
          );
          return [slot, stored?.label ?? fallback?.label ?? ""];
        }),
      ),
    ]),
  ) as Record<ModeKey, Record<AnchorSlotKey, string>>;

  const { startsOn } = getWeekRange(context.localDate);
  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(
    (label, index) => {
      const date = new Date(startsOn);
      date.setUTCDate(startsOn.getUTCDate() + index);
      const dateKey = date.toISOString().slice(0, 10);
      const log = context.weekLogs.find(
        (item) => item.localDate.toISOString().slice(0, 10) === dateKey,
      );
      const success = log?.focusDone && log.bodyDone && log.shutdownDone;
      const state = success
        ? "done"
        : log?.energy
          ? "partial"
          : dateKey === context.localDate
            ? "current"
            : "empty";
      return { label, state } as const;
    },
  );

  return (
    <TodayClient
      dateLabel={formatRussianDate(context.localDate)}
      energy={context.dailyLog?.energy ?? null}
      sleep={context.dailyLog?.sleep ?? null}
      suggestedMode={
        (context.dailyLog?.suggestedMode as ModeKey | null) ?? null
      }
      selectedMode={(context.dailyLog?.selectedMode as ModeKey | null) ?? null}
      manuallySelected={context.dailyLog?.modeManuallySelected ?? false}
      primaryFocus={context.dailyLog?.primaryFocus ?? ""}
      eveningNote={context.dailyLog?.eveningNote ?? ""}
      anchorLabels={anchorLabels}
      anchorDone={{
        FOCUS: context.dailyLog?.focusDone ?? false,
        BODY: context.dailyLog?.bodyDone ?? false,
        SHUTDOWN: context.dailyLog?.shutdownDone ?? false,
      }}
      weekDays={weekDays}
      weekSuccessCount={
        context.weekLogs.filter(
          (log) => log.focusDone && log.bodyDone && log.shutdownDone,
        ).length
      }
      weekOutcome={context.week.mainOutcome}
      targets={context.week.targets.map((target) => ({
        id: target.id,
        name: target.name,
        target: target.targetSessions,
        actual: target.sessions.length,
        lastSessionId: target.sessions[0]?.id ?? null,
      }))}
    />
  );
}
