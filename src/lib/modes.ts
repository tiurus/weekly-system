export const modeOrder = ["MINIMUM", "NORMAL", "RESOURCE"] as const;
export type ModeKey = (typeof modeOrder)[number];
export type AnchorSlotKey = "FOCUS" | "BODY" | "SHUTDOWN";

export const modeContent: Record<
  ModeKey,
  { title: string; short: string; description: string; tone: string }
> = {
  MINIMUM: {
    title: "Минимум",
    short: "Мин",
    description: "Сохраняем систему без требования поставить рекорд.",
    tone: "red",
  },
  NORMAL: {
    title: "Обычный день",
    short: "Обыч",
    description: "Устойчивый темп без перегруза.",
    tone: "amber",
  },
  RESOURCE: {
    title: "Ресурс",
    short: "Рес",
    description: "Используем хороший ресурс для качества и продвижения.",
    tone: "green",
  },
};

export const defaultAnchors: Array<{
  mode: ModeKey;
  slot: AnchorSlotKey;
  label: string;
}> = [
  { mode: "MINIMUM", slot: "FOCUS", label: "20 минут на главной задаче" },
  { mode: "MINIMUM", slot: "BODY", label: "Выйти из дома и пройтись 15 минут" },
  {
    mode: "MINIMUM",
    slot: "SHUTDOWN",
    label: "Прекратить рабочие дела к установленному времени",
  },
  {
    mode: "NORMAL",
    slot: "FOCUS",
    label: "Один фокус-блок 60–90 минут на главной задаче",
  },
  {
    mode: "NORMAL",
    slot: "BODY",
    label: "30–45 минут движения или тренировка",
  },
  {
    mode: "NORMAL",
    slot: "SHUTDOWN",
    label:
      "Закрыть работу, выполнить вечерний ритуал и не возвращаться к задачам",
  },
  {
    mode: "RESOURCE",
    slot: "FOCUS",
    label: "Сложная задача или два фокус-блока по 60 минут",
  },
  {
    mode: "RESOURCE",
    slot: "BODY",
    label: "Полноценная тренировка или интенсивная активность",
  },
  {
    mode: "RESOURCE",
    slot: "SHUTDOWN",
    label: "Закрыть работу и за 5 минут определить главное на завтра",
  },
];

export function suggestMode(energy: number, sleep: number): ModeKey {
  if (energy === 1 || sleep === 1) return "MINIMUM";
  if (energy === 3 && sleep >= 2) return "RESOURCE";
  return "NORMAL";
}
