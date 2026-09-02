export function getLocalDateString(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(now);
}

export function dateFromLocalDate(localDate: string) {
  return new Date(`${localDate}T00:00:00.000Z`);
}

export function getWeekRange(localDate: string) {
  const current = dateFromLocalDate(localDate);
  const daysSinceMonday = (current.getUTCDay() + 6) % 7;
  const startsOn = new Date(current);
  startsOn.setUTCDate(current.getUTCDate() - daysSinceMonday);
  const endsOn = new Date(startsOn);
  endsOn.setUTCDate(startsOn.getUTCDate() + 6);
  return { startsOn, endsOn };
}

export function formatRussianDate(localDate: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dateFromLocalDate(localDate));
}
