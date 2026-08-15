$ErrorActionPreference = 'Stop'

# Script temporário: redefine senha de prof.taisregina@gmail.com via Admin API.
# Não imprime senha. Não altera membership/permissões/convites.

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

$tmpMjs = Join-Path (Get-Location) ".tmp-reset-maicon.mjs"

$mjsContent = @'
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const password = process.env.TR_TMP_PASS;
if (!password) {
  console.log("FAIL");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const targetEmail = "prof.taisregina@gmail.com";
let userId = null;

for (let page = 1; page <= 20; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.log("FAIL");
    process.exit(1);
  }
  const found = (data.users || []).find(
    (u) => (u.email || "").toLowerCase() === targetEmail
  );
  if (found) {
    userId = found.id;
    break;
  }
  if ((data.users || []).length < 200) break;
}

if (!userId) {
  console.log("FAIL");
  process.exit(1);
}

const { data: byId, error: getErr } = await admin.auth.admin.getUserById(userId);
if (getErr || !byId?.user) {
  console.log("FAIL");
  process.exit(1);
}

const hasEmailIdentity = (byId.user.identities || []).some(
  (i) => i.provider === "email"
);
if (!hasEmailIdentity) {
  console.log("FAIL");
  process.exit(1);
}

const { data: company, error: companyErr } = await admin
  .from("companies")
  .select("id")
  .eq("name", "Teste")
  .maybeSingle();

if (companyErr || !company) {
  console.log("FAIL");
  process.exit(1);
}

const { data: membership, error: memErr } = await admin
  .from("company_members")
  .select("role, access_profile, status")
  .eq("company_id", company.id)
  .eq("user_id", userId)
  .maybeSingle();

if (
  memErr ||
  !membership ||
  membership.role !== "owner" ||
  membership.access_profile !== "administrator" ||
  membership.status !== "active"
) {
  console.log("FAIL");
  process.exit(1);
}

const { error } = await admin.auth.admin.updateUserById(userId, { password });
if (error) {
  console.log("FAIL");
  process.exit(1);
}

console.log("OK");
'@

Set-Content -LiteralPath $tmpMjs -Value $mjsContent -Encoding utf8

try {
  $secure = Read-Host -AsSecureString -Prompt "Digite a nova senha (nao sera ecoada)"
  if ($null -eq $secure -or $secure.Length -eq 0) {
    Write-Output "FAIL"
    exit 1
  }

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $env:TR_TMP_PASS = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $secure.Dispose()
  }

  node $tmpMjs
  if ($LASTEXITCODE -ne 0) {
    exit 1
  }
}
finally {
  Remove-Item Env:TR_TMP_PASS -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $tmpMjs -Force -ErrorAction SilentlyContinue
}
