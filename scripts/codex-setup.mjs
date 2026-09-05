import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

async function setup() {
  if (Number(process.versions.node.split(".")[0]) !== 24) {
    throw new Error(
      `Node.js 24 is required; found ${process.version}. Activate the version in .nvmrc and rerun setup.`,
    );
  }

  const { packageManager } = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const requiredVersion = /^pnpm@(\d+\.\d+\.\d+)$/.exec(packageManager)?.[1];
  if (!requiredVersion) {
    throw new Error(
      "package.json must pin an exact pnpm packageManager version.",
    );
  }

  const options = {
    cwd: projectRoot,
    // Windows package-manager shims need a shell. All command arguments are fixed.
    shell: process.platform === "win32",
  };
  const version = spawnSync("pnpm", ["--version"], {
    ...options,
    encoding: "utf8",
  });
  if (
    version.error ||
    version.status !== 0 ||
    version.stdout.trim() !== requiredVersion
  ) {
    throw new Error(
      `Install or activate pnpm ${requiredVersion} from package.json, then rerun setup.`,
    );
  }

  function run(args, env = process.env) {
    const result = spawnSync("pnpm", args, {
      ...options,
      env,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      throw new Error(`pnpm ${args.join(" ")} failed. Setup stopped.`);
    }
  }

  run(["install", "--frozen-lockfile"]);
  run(["db:generate"], {
    ...process.env,
    // Prisma config requires a URL for generation, which does not connect to a DB.
    // Keep this placeholder in the child process; never create or copy env files.
    DATABASE_URL: "postgresql://codex:codex@127.0.0.1:1/weekly_system_codegen",
  });

  console.log(
    "Dependencies and Prisma client are ready. Configure your local environment and database separately before running the app; see README.md.",
  );
}

setup().catch((error) => {
  console.error(error.message);
  process.exitCode ||= 1;
});
