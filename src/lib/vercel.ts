const VERCEL_API_BASE = "https://api.vercel.com";
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export function checkVercelEnv() {
  const missing: string[] = [];
  if (!VERCEL_TOKEN) missing.push("VERCEL_API_TOKEN");
  if (!VERCEL_PROJECT_ID) missing.push("VERCEL_PROJECT_ID");
  return missing;
}

if (checkVercelEnv().length > 0) {
  console.warn(
    `[vercel.ts] Missing Vercel env vars: ${checkVercelEnv().join(", ")}. Domain operations will fail until these are configured.`
  );
}

function vercelHeaders() {
  if (!VERCEL_TOKEN) {
    throw new Error("VERCEL_API_TOKEN is not configured");
  }
  return {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function teamQuery() {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
}

export async function addDomainToVercel(hostname: string) {
  if (!VERCEL_PROJECT_ID) {
    throw new Error("VERCEL_PROJECT_ID is not configured");
  }
  const res = await fetch(
    `${VERCEL_API_BASE}/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery()}`,
    { method: "POST", headers: vercelHeaders(), body: JSON.stringify({ name: hostname }) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to add domain to Vercel");
  return data;
}

export async function getDomainStatus(hostname: string) {
  if (!VERCEL_PROJECT_ID) {
    throw new Error("VERCEL_PROJECT_ID is not configured");
  }
  const res = await fetch(
    `${VERCEL_API_BASE}/v9/projects/${VERCEL_PROJECT_ID}/domains/${hostname}${teamQuery()}`,
    { headers: vercelHeaders() }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to fetch domain status");
  return data;
}

export async function removeDomainFromVercel(hostname: string) {
  if (!VERCEL_PROJECT_ID) {
    throw new Error("VERCEL_PROJECT_ID is not configured");
  }
  const res = await fetch(
    `${VERCEL_API_BASE}/v9/projects/${VERCEL_PROJECT_ID}/domains/${hostname}${teamQuery()}`,
    { method: "DELETE", headers: vercelHeaders() }
  );
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error?.message || "Failed to remove domain from Vercel");
  }
  return true;
}

export async function getDomainConfig(hostname: string) {
  if (!VERCEL_PROJECT_ID) {
    throw new Error("VERCEL_PROJECT_ID is not configured");
  }
  const res = await fetch(
    `${VERCEL_API_BASE}/v6/domains/${hostname}/config${teamQuery()}`,
    { headers: vercelHeaders() }
  );
  return res.json();
}
