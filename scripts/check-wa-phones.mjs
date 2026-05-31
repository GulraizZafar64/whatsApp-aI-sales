/**
 * Verify each business: DB whatsapp_token must access its phone_number_id on Meta.
 * Usage: node scripts/check-wa-phones.mjs
 */
import { readFileSync } from "fs";
import mysql from "mysql2/promise";

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

async function verifyPhone(token, phoneNumberId) {
  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}?fields=id,display_phone_number,verified_name,status`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { http: res.status, data: await res.json() };
}

const conn = await mysql.createConnection(env.DATABASE_URL);
const [rows] = await conn.execute(
  `SELECT id, phone_number_id, whatsapp_number, business_account_id,
          LENGTH(whatsapp_token) AS token_len
   FROM businesses ORDER BY id`
);

if (!rows.length) {
  console.log("No businesses in database.");
  await conn.end();
  process.exit(0);
}

for (const row of rows) {
  const [tokRows] = await conn.execute(
    "SELECT whatsapp_token FROM businesses WHERE id = ?",
    [row.id]
  );
  const token = tokRows[0]?.whatsapp_token?.trim();
  console.log("\n" + "—".repeat(50));
  console.log(
    `#${row.id} ${row.whatsapp_number ?? "?"} phone_number_id=${row.phone_number_id}`
  );

  if (!token) {
    console.log("FAIL: no whatsapp_token — sign in with WhatsApp again.");
    continue;
  }

  const { http, data } = await verifyPhone(token, row.phone_number_id);
  if (http === 200) {
    console.log("OK:", data.display_phone_number, data.verified_name, data.status);
  } else {
    console.log("FAIL:", data.error?.message ?? http);
  }
}

await conn.end();
