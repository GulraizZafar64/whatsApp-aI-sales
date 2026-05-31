/**
 * One-time fix: subscribe this Meta app to every WABA in businesses table.
 * Run on server: node scripts/fix-waba-subscribe.mjs
 */
import { readFileSync } from "fs";
import mysql from "mysql2/promise";

const GRAPH_VERSION = "v25.0";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      const key = l.slice(0, i);
      let val = l.slice(i + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      return [key, val];
    })
);

if (!env.DATABASE_URL) {
  console.error("Set DATABASE_URL in .env");
  process.exit(1);
}

async function subscribeWaba(wabaId, token) {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/subscribed_apps`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    }
  );
  const data = await res.json();
  return { ok: res.ok && data.success !== false, data };
}

const conn = await mysql.createConnection(env.DATABASE_URL);
const [rows] = await conn.execute(
  `SELECT id, business_account_id, whatsapp_number, LENGTH(whatsapp_token) AS token_len
   FROM businesses
   WHERE business_account_id IS NOT NULL AND whatsapp_token IS NOT NULL`
);

console.log(`Found ${rows.length} business(es)...\n`);

const seenWaba = new Set();

for (const row of rows) {
  const wabaId = String(row.business_account_id).trim();
  if (!wabaId || seenWaba.has(wabaId)) continue;
  seenWaba.add(wabaId);

  const [tok] = await conn.execute(
    "SELECT whatsapp_token FROM businesses WHERE id = ?",
    [row.id]
  );
  const token = tok[0]?.whatsapp_token;
  if (!token?.trim()) {
    console.log(`❌ ${row.whatsapp_number ?? row.id} — no whatsapp_token`);
    continue;
  }

  try {
    const { ok, data } = await subscribeWaba(wabaId, token);
    if (ok) {
      console.log(`✅ ${row.whatsapp_number ?? "WABA " + wabaId} — subscribed`);
    } else {
      console.log(
        `❌ ${row.whatsapp_number ?? wabaId} —`,
        data.error?.message ?? JSON.stringify(data)
      );
    }
  } catch (err) {
    console.log(`❌ ${row.whatsapp_number ?? wabaId} —`, err.message);
  }
}

await conn.end();
console.log("\nDone.");
