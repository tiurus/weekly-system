"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  dateFromLocalDate,
  getLocalDateString,
  getWeekRange,
} from "@/lib/local-date";
import { modeOrder, suggestMode } from "@/lib/modes";

const score = z.number().int().min(1).max(3);
const modeSchema = z.enum(modeOrder);
const slotSchema = z.enum(["FOCUS", "BODY", "SHUTDOWN"]);

async function mutationContext() {
  const user = await requireUser();
  const localDate = getLocalDateString(user.timezone);
  const date = dateFromLocalDate(localDate);
  const { startsOn, endsOn } = getWeekRange(localDate);
  const week = await db.week.upsert({
    where: { userId_startsOn: { userId: user.id, startsOn } },
    create: { userId: user.id, startsOn, endsOn },
    update: {},
  });
  return { user, date, week };
}

export async function saveCheckIn(input: { energy: number; sleep: number }) {
  const parsed = z.object({ energy: score, sleep: score }).parse(input);
  const { user, date, week } = await mutationContext();
  const suggestedMode = suggestMode(parsed.energy, parsed.sleep);
  const existing = await db.dailyLog.findUnique({
    where: { userId_localDate: { userId: user.id, localDate: date } },
    select: { selectedMode: true, modeManuallySelected: true },
  });
  const selectedMode =
    existing?.modeManuallySelected && existing.selectedMode
      ? existing.selectedMode
      : suggestedMode;

  await db.dailyLog.upsert({
    where: { userId_localDate: { userId: user.id, localDate: date } },
    create: {
      userId: user.id,
      weekId: week.id,
      localDate: date,
      energy: parsed.energy,
      sleep: parsed.sleep,
      suggestedMode,
      selectedMode,
    },
    update: {
      weekId: week.id,
      energy: parsed.energy,
      sleep: parsed.sleep,
      suggestedMode,
      selectedMode,
    },
  });

  revalidatePath("/today");
  return { ok: true as const, suggestedMode, selectedMode };
}

export async function selectMode(input: { mode: string }) {
  const mode = modeSchema.parse(input.mode);
  const { user, date } = await mutationContext();
  await db.dailyLog.update({
    where: { userId_localDate: { userId: user.id, localDate: date } },
    data: { selectedMode: mode, modeManuallySelected: true },
  });
  revalidatePath("/today");
  return { ok: true as const, selectedMode: mode };
}

export async function toggleAnchor(input: { slot: string; done: boolean }) {
  const parsed = z.object({ slot: slotSchema, done: z.boolean() }).parse(input);
  const { user, date } = await mutationContext();
  const field = {
    FOCUS: "focusDone",
    BODY: "bodyDone",
    SHUTDOWN: "shutdownDone",
  }[parsed.slot] as "focusDone" | "bodyDone" | "shutdownDone";

  await db.dailyLog.update({
    where: { userId_localDate: { userId: user.id, localDate: date } },
    data: { [field]: parsed.done },
  });
  revalidatePath("/today");
  return { ok: true as const };
}

export async function savePrimaryFocus(input: { value: string }) {
  const value = z.string().trim().max(180).parse(input.value);
  const { user, date } = await mutationContext();
  await db.dailyLog.update({
    where: { userId_localDate: { userId: user.id, localDate: date } },
    data: { primaryFocus: value || null },
  });
  revalidatePath("/today");
  return { ok: true as const };
}

export async function saveEveningNote(input: { value: string }) {
  const value = z.string().trim().max(500).parse(input.value);
  const { user, date } = await mutationContext();
  await db.dailyLog.update({
    where: { userId_localDate: { userId: user.id, localDate: date } },
    data: { eveningNote: value || null },
  });
  revalidatePath("/today");
  return { ok: true as const };
}

export async function addActivitySession(input: {
  targetId: string;
  idempotencyKey: string;
}) {
  const parsed = z
    .object({ targetId: z.uuid(), idempotencyKey: z.uuid() })
    .parse(input);
  const { user, date, week } = await mutationContext();
  const target = await db.weeklyTarget.findFirst({
    where: { id: parsed.targetId, userId: user.id, weekId: week.id },
    select: { id: true },
  });
  if (!target) throw new Error("Weekly target not found");

  const dailyLog = await db.dailyLog.findUnique({
    where: { userId_localDate: { userId: user.id, localDate: date } },
    select: { id: true },
  });
  const session = await db.activitySession.upsert({
    where: { idempotencyKey: parsed.idempotencyKey },
    create: {
      userId: user.id,
      targetId: target.id,
      dailyLogId: dailyLog?.id,
      idempotencyKey: parsed.idempotencyKey,
    },
    update: {},
    select: { id: true, userId: true, targetId: true },
  });
  if (session.userId !== user.id || session.targetId !== target.id) {
    throw new Error("Idempotency key collision");
  }

  revalidatePath("/today");
  return { ok: true as const, sessionId: session.id };
}

export async function undoActivitySession(input: { sessionId: string }) {
  const sessionId = z.uuid().parse(input.sessionId);
  const { user } = await mutationContext();
  await db.activitySession.deleteMany({
    where: { id: sessionId, userId: user.id },
  });
  revalidatePath("/today");
  return { ok: true as const };
}
