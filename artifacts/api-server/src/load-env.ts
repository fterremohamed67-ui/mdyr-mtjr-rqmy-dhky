import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

for (const envName of [".env.local", ".env"]) {
  const envFile = path.join(workspaceRoot, envName);
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}
