import { describe, expect, it } from "vitest";
import {
  clearLoginFailures,
  isLoginBlocked,
  registerLoginFailure,
} from "./login-rate-limit";

describe("login rate limit", () => {
  it("blocks after five failures and can be cleared", () => {
    const key = "test-ip:test-user";
    clearLoginFailures(key);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      registerLoginFailure(key);
    }
    expect(isLoginBlocked(key)).toBe(true);
    clearLoginFailures(key);
    expect(isLoginBlocked(key)).toBe(false);
  });
});
