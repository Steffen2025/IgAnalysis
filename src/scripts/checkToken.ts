import "dotenv/config";
import { validateToken } from "../services/apify/index.js";

async function main() {
  const token = validateToken();
  console.log(`Token found (length=${token.length}, prefix=${token.slice(0, 9)}…)`);

  const res = await fetch("https://api.apify.com/v2/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log(`HTTP ${res.status} ${res.statusText}`);
  if (!res.ok) {
    console.error("Token rejected by Apify.");
    console.error((await res.text()).slice(0, 500));
    process.exit(1);
  }

  const body = (await res.json()) as { data: Record<string, unknown> };
  const d = body.data;
  console.log("Apify account confirmed:");
  console.log({
    id: d.id,
    username: d.username,
    email: d.email,
    plan: d.plan,
    createdAt: d.createdAt,
  });
}

main().catch((err) => {
  console.error("Token check failed:", err.message);
  process.exit(1);
});
