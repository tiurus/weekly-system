"use server";

import argon2 from "argon2";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, ensureConfiguredOwner } from "@/lib/auth";
import {
  clearLoginFailures,
  isLoginBlocked,
  registerLoginFailure,
} from "@/lib/login-rate-limit";

export type LoginState = { error?: string };

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
  returnTo: z.string().optional(),
});

function safeReturnTo(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return "/today";
  return value;
}

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Неверный логин или пароль" };

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}:${parsed.data.username.toLocaleLowerCase("ru-RU")}`;
  if (isLoginBlocked(key))
    return { error: "Слишком много попыток. Попробуйте позже" };

  const owner = await ensureConfiguredOwner();
  const passwordMatches = await argon2.verify(
    owner.passwordHash,
    parsed.data.password,
  );
  const usernameMatches = owner.username === parsed.data.username;

  if (!passwordMatches || !usernameMatches) {
    registerLoginFailure(key);
    return { error: "Неверный логин или пароль" };
  }

  clearLoginFailures(key);
  await createSession(owner.id);
  redirect(safeReturnTo(parsed.data.returnTo));
}
