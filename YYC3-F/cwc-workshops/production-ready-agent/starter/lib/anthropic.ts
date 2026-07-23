import Anthropic from "@anthropic-ai/sdk";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Read .env directly so a shell-exported ANTHROPIC_API_KEY (e.g. a personal
// key in .zshrc) can't shadow the workshop key. Next's dotenv and bun
// --env-file both refuse to override existing process env. bin/setup.sh
// copies the repo-root .env into each app dir; fall back to the root for a
// fresh checkout where setup hasn't run yet.
const envPath = [join(process.cwd(), ".env"), join(process.cwd(), "..", ".env")].find(existsSync);
const dotenv = Object.fromEntries(
  (envPath ? readFileSync(envPath, "utf8") : "")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      const v = l.slice(i + 1).split(/\s+#/)[0].trim();
      return [l.slice(0, i).trim(), v];
    }),
);

const env = (k: string) => {
  const v = dotenv[k] ?? process.env[k];
  return v && !v.includes("...") ? v : undefined;
};

export const client = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") });

export const ids = {
  agent: env("AGENT_DEAL_TEAM_ID")!,
  environment: env("ENVIRONMENT_ID")!,
  memoryStore: env("MEMORY_STORE_ID")!,
  files: (env("FILE_IDS") ?? "").split(",").filter(Boolean),
  vault: env("VAULT_ID"),
};

// Workshop scaffolding. A stubbed route ends with `return stub("TODO n", ...)`;
// add your implementation above that line and the stub becomes unreachable.
export function stub(label: string, hint: string): Response {
  const message = `${label} — not implemented yet.\nWrite your ${hint} call above the \`return stub(...)\` line.`;
  console.error(`\x1b[33m[${label}]\x1b[0m ${hint} not implemented`);
  return new Response(message, { status: 501 });
}

