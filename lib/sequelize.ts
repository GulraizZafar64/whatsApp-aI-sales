import { Sequelize } from "sequelize";

declare global {
  // eslint-disable-next-line no-var
  var __whatsappSalesSequelize: Sequelize | undefined;
}

function createConnection(): Sequelize {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new Sequelize(url, {
      logging: process.env.SEQUELIZE_LOGGING === "1" ? console.log : false,
    });
  }

  const host = process.env.DB_HOST ?? "127.0.0.1";
  const port = Number(process.env.DB_PORT ?? "3306");
  const database = process.env.DB_NAME;
  const username = process.env.DB_USER;
  const password = process.env.DB_PASSWORD ?? "";

  if (!database || !username) {
    throw new Error(
      "Database not configured: set DATABASE_URL, or DB_HOST, DB_NAME, and DB_USER (optional DB_PASSWORD, DB_PORT)."
    );
  }

  return new Sequelize(database, username, password, {
    host,
    port,
    dialect: "mysql",
    logging: process.env.SEQUELIZE_LOGGING === "1" ? console.log : false,
  });
}

/** Lazy singleton so `next build` does not require DB env at compile time. */
export function getSequelize(): Sequelize {
  if (globalThis.__whatsappSalesSequelize) {
    return globalThis.__whatsappSalesSequelize;
  }
  globalThis.__whatsappSalesSequelize = createConnection();
  return globalThis.__whatsappSalesSequelize;
}

let ready: Promise<void> | null = null;

export async function ensureDb(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const sequelize = getSequelize();
      const { initModels } = await import("@/lib/models");
      initModels(sequelize);
      await sequelize.sync();
      const { patchMysqlSchema } = await import("@/lib/mysql-schema-patch");
      await patchMysqlSchema(sequelize);
    })();
  }
  await ready;
}
