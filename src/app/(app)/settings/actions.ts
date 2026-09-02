"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocalDateString, getWeekRange } from "@/lib/local-date";

export type TargetFormState = { error?: string; success?: string };

async function currentWeek() {
  const user = await requireUser();
  const range = getWeekRange(getLocalDateString(user.timezone));
  const week = await db.week.upsert({
    where: { userId_startsOn: { userId: user.id, startsOn: range.startsOn } },
    create: { userId: user.id, ...range },
    update: {},
  });
  return { user, week };
}

export async function createWeeklyTarget(
  _state: TargetFormState,
  formData: FormData,
): Promise<TargetFormState> {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      targetSessions: z.coerce.number().int().min(1).max(20),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: "Укажи название и цель от 1 до 20 сессий" };

  const { user, week } = await currentWeek();
  const existing = await db.weeklyTarget.findMany({
    where: { userId: user.id, weekId: week.id },
    select: { position: true },
  });
  if (existing.length >= 3)
    return { error: "На неделю можно выбрать не более трёх целей" };

  await db.weeklyTarget.create({
    data: {
      userId: user.id,
      weekId: week.id,
      name: parsed.data.name,
      targetSessions: parsed.data.targetSessions,
      position: Math.max(-1, ...existing.map((target) => target.position)) + 1,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/today");
  return { success: "Цель добавлена" };
}

export async function deleteWeeklyTarget(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const { user, week } = await currentWeek();
  await db.weeklyTarget.deleteMany({
    where: { id, userId: user.id, weekId: week.id },
  });
  revalidatePath("/settings");
  revalidatePath("/today");
}

export async function saveWeekOutcome(formData: FormData) {
  const outcome = z.string().trim().max(180).parse(formData.get("outcome"));
  const { user, week } = await currentWeek();
  await db.week.updateMany({
    where: { id: week.id, userId: user.id },
    data: { mainOutcome: outcome || null },
  });
  revalidatePath("/settings");
  revalidatePath("/today");
}
