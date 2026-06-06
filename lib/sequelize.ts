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
    pool: { max: 10, min: 0, acquire: 15_000, idle: 10_000 },
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
    pool: { max: 10, min: 0, acquire: 15_000, idle: 10_000 },
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

const ER_LOCK_DEADLOCK = 1213;

function isDeadlockError(error: unknown): boolean {
  const ex = error as {
    parent?: { errno?: number };
    original?: { errno?: number };
  };
  const errno = ex.parent?.errno ?? ex.original?.errno;
  return errno === ER_LOCK_DEADLOCK;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDbInit(): Promise<void> {
  const sequelize = getSequelize();
  const { initModels } = await import("@/lib/models");
  initModels(sequelize);
  await sequelize.authenticate();

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Create missing tables first so legacy patch DDL never runs on an empty DB.
      // Never `alter: true` at runtime — parallel Next.js workers deadlock on DDL.
      const useAlter =
        process.env.DB_SYNC_ALTER === "1" && process.env.NODE_ENV !== "production";
      await sequelize.sync(useAlter ? { alter: true } : undefined);
      const { patchMysqlSchema } = await import("@/lib/mysql-schema-patch");
      await patchMysqlSchema(sequelize);
      return;
    } catch (error) {
      if (isDeadlockError(error) && attempt < maxAttempts) {
        await sleep(150 * attempt);
        continue;
      }
      throw error;
    }
  }
}

export async function ensureDb(): Promise<void> {
  if (!ready) {
    ready = runDbInit().catch((error) => {
      ready = null;
      throw error;
    });
  }
  await ready;
}
