type Attempt = { failures: number; blockedUntil: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export function isLoginBlocked(key: string) {
  const attempt = attempts.get(key);
  if (!attempt) return false;
  if (attempt.blockedUntil <= Date.now()) {
    attempts.delete(key);
    return false;
  }
  return attempt.failures >= MAX_FAILURES;
}

export function registerLoginFailure(key: string) {
  const current = attempts.get(key);
  attempts.set(key, {
    failures: (current?.failures ?? 0) + 1,
    blockedUntil: current?.blockedUntil ?? Date.now() + WINDOW_MS,
  });
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
