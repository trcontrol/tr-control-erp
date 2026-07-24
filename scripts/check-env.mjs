import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");

if (!fs.existsSync(envPath)) {
  console.log("ENV_STATUS=missing_file");
  process.exit(1);
}

const env = {};

for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex === -1) continue;

  env[trimmed.slice(0, separatorIndex).trim()] = trimmed
    .slice(separatorIndex + 1)
    .trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

const checks = {
  hasUrl: Boolean(url),
  hasKey: Boolean(key),
  urlValid:
    url.startsWith("https://") &&
    url.includes(".supabase.co") &&
    !url.includes("your-project"),
  keyValid: key.length > 20 && !key.includes("your-publishable"),
  noServiceRole: !env.SUPABASE_SERVICE_ROLE_KEY,
};

const ok = Object.values(checks).every(Boolean);

console.log(`ENV_STATUS=${ok ? "ok" : "invalid"}`);
console.log(`CHECKS=${JSON.stringify(checks)}`);
process.exit(ok ? 0 : 1);
