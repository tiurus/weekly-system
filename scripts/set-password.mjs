import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import argon2 from "argon2";

const envPath = resolve(process.cwd(), process.env.ENV_FILE ?? ".env.local");

async function readHiddenPassword() {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8").trimEnd();
  }

  process.stdout.write("Пароль владельца: ");
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolvePassword, reject) => {
    let value = "";
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      resolvePassword(value);
    };
    process.stdin.on("data", (chunk) => {
      const key = chunk.toString("utf8");
      if (key === "\r" || key === "\n") return finish();
      if (key === "\u0003") {
        process.stdin.setRawMode(false);
        reject(new Error("Ввод отменён"));
        return;
      }
      if (key === "\u007f") value = value.slice(0, -1);
      else value += key;
    });
  });
}

const password = await readHiddenPassword();

if (password.length < 12) {
  throw new Error("Пароль должен содержать не менее 12 символов.");
}

const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
});
const current = await readFile(envPath, "utf8");
const next = current.replace(
  /^APP_PASSWORD_HASH=.*$/m,
  `APP_PASSWORD_HASH=${hash}`,
);

if (next === current) {
  throw new Error(`В ${envPath} отсутствует APP_PASSWORD_HASH.`);
}

await writeFile(envPath, next, { encoding: "utf8", mode: 0o600 });
process.stdout.write("Хеш пароля сохранён в локальной конфигурации.\n");
