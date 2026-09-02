import { db } from "@/lib/db";
import {
  dateFromLocalDate,
  getLocalDateString,
  getWeekRange,
} from "@/lib/local-date";

export async function getTodayContext(userId: string, timeZone: string) {
  const localDate = getLocalDateString(timeZone);
  const date = dateFromLocalDate(localDate);
  const { startsOn, endsOn } = getWeekRange(localDate);

  const week = await db.week.upsert({
    where: { userId_startsOn: { userId, startsOn } },
    create: { userId, startsOn, endsOn },
    update: {},
    include: {
      targets: {
        orderBy: { position: "asc" },
        take: 3,
        include: { sessions: { select: { id: true } } },
      },
    },
  });

  const [dailyLog, templates, weekLogs] = await Promise.all([
    db.dailyLog.findUnique({
      where: { userId_localDate: { userId, localDate: date } },
    }),
    db.dailyAnchorTemplate.findMany({ where: { userId } }),
    db.dailyLog.findMany({
      where: { userId, localDate: { gte: startsOn, lte: endsOn } },
      select: {
        localDate: true,
        focusDone: true,
        bodyDone: true,
        shutdownDone: true,
        energy: true,
      },
    }),
  ]);

  return { localDate, week, dailyLog, templates, weekLogs };
}
