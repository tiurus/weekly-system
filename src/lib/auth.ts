import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { defaultAnchors } from "@/lib/modes";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionTtlMs() {
  const days = Number(process.env.SESSION_TTL_DAYS ?? "30");
  return (Number.isFinite(days) && days > 0 ? days : 30) * 24 * 60 * 60 * 1000;
}

export async function ensureConfiguredOwner() {
  const passwordHash = requiredEnv("APP_PASSWORD_HASH");
  if (!passwordHash.startsWith("$argon2id$")) {
    throw new Error("APP_PASSWORD_HASH must be an Argon2id hash");
  }

  const user = await db.user.upsert({
    where: { id: requiredEnv("APP_OWNER_ID") },
    create: {
      id: requiredEnv("APP_OWNER_ID"),
      username: requiredEnv("APP_USERNAME"),
      passwordHash,
      timezone: process.env.APP_TIMEZONE ?? "Europe/Moscow",
    },
    update: {
      username: requiredEnv("APP_USERNAME"),
      passwordHash,
      timezone: process.env.APP_TIMEZONE ?? "Europe/Moscow",
    },
  });

  await db.dailyAnchorTemplate.createMany({
    data: defaultAnchors.map((anchor) => ({ ...anchor, userId: user.id })),
    skipDuplicates: true,
  });

  return user;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlMs());

  await db.session.create({
    data: { userId, tokenHash: tokenHash(token), expiresAt },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) return null;

  if (Date.now() - session.lastUsedAt.getTime() > 60 * 60 * 1000) {
    await db.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token)
    await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  store.delete(SESSION_COOKIE_NAME);
}
