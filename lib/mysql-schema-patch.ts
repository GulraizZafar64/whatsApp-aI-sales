import type { Sequelize } from "sequelize";

const ER_DUP_FIELDNAME = 1060;
const ER_DUP_KEYNAME = 1061;
const ER_CANT_DROP_FIELD = 1091;
const ER_BAD_FIELD_ERROR = 1054;
const ER_NO_SUCH_TABLE = 1146;
const SCHEMA_LOCK_NAME = "whatsapp_sales_schema";
const SCHEMA_LOCK_WAIT_SEC = 5;
const SCHEMA_LOCK_MAX_WAIT_MS = 120_000;

function isIgnorablePatchError(e: unknown): boolean {
  const ex = e as {
    parent?: { errno?: number; code?: string; sqlMessage?: string };
    original?: { errno?: number };
  };
  const errno = ex.parent?.errno ?? ex.original?.errno;
  const msg = String(ex.parent?.sqlMessage ?? (e as Error)?.message ?? "");
  return (
    errno === ER_DUP_FIELDNAME ||
    errno === ER_DUP_KEYNAME ||
    errno === ER_CANT_DROP_FIELD ||
    errno === ER_BAD_FIELD_ERROR ||
    errno === ER_NO_SUCH_TABLE ||
    ex.parent?.code === "ER_DUP_FIELDNAME" ||
    ex.parent?.code === "ER_DUP_KEYNAME" ||
    ex.parent?.code === "ER_CANT_DROP_FIELD_OR_KEY" ||
    /duplicate column/i.test(msg) ||
    /duplicate key name/i.test(msg) ||
    /check that column/i.test(msg)
  );
}

async function runSqlOptional(sequelize: Sequelize, sql: string): Promise<void> {
  try {
    await sequelize.query(sql);
  } catch (e: unknown) {
    if (isIgnorablePatchError(e)) return;
    throw e;
  }
}

async function runSqlRequired(sequelize: Sequelize, sql: string): Promise<void> {
  await sequelize.query(sql);
}

async function tableExists(
  sequelize: Sequelize,
  table: string
): Promise<boolean> {
  const [rows] = await sequelize.query(`SHOW TABLES LIKE '${table}'`);
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(
  sequelize: Sequelize,
  table: string,
  column: string
): Promise<boolean> {
  if (!(await tableExists(sequelize, table))) return false;
  const [rows] = await sequelize.query(
    `SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function dropColumnIfExists(
  sequelize: Sequelize,
  table: string,
  column: string
): Promise<void> {
  if (!(await columnExists(sequelize, table, column))) return;
  await runSqlOptional(
    sequelize,
    `ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``
  );
}

async function addColumnIfMissing(
  sequelize: Sequelize,
  table: string,
  ddl: string
): Promise<void> {
  if (!(await tableExists(sequelize, table))) return;
  const col = ddl.match(/ADD COLUMN `([^`]+)`/)?.[1];
  if (col && (await columnExists(sequelize, table, col))) return;
  await runSqlRequired(sequelize, `ALTER TABLE \`${table}\` ${ddl}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Serialize migrations when multiple Next.js workers start at once. */
async function withMysqlSchemaLock(
  sequelize: Sequelize,
  run: () => Promise<void>
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < SCHEMA_LOCK_MAX_WAIT_MS) {
    const [rows] = await sequelize.query(
      `SELECT GET_LOCK('${SCHEMA_LOCK_NAME}', ${SCHEMA_LOCK_WAIT_SEC}) AS acquired`
    );
    const acquired = Number(
      (rows as Array<{ acquired: number }>)[0]?.acquired ?? 0
    );
    if (acquired === 1) {
      try {
        await run();
      } finally {
        await sequelize.query(`SELECT RELEASE_LOCK('${SCHEMA_LOCK_NAME}')`);
      }
      return;
    }
    await sleep(400);
  }
  throw new Error("Timed out waiting for MySQL schema migration lock.");
}

/**
 * Legacy → lean schema. Idempotent; safe to run once per process at startup.
 */
export async function patchMysqlSchema(sequelize: Sequelize): Promise<void> {
  if (sequelize.getDialect() !== "mysql") return;

  await withMysqlSchemaLock(sequelize, async () => {
  await runSqlOptional(
    sequelize,
    `CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`email\` VARCHAR(255) NOT NULL,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`name\` VARCHAR(255) NULL,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`users_email_unique\` (\`email\`)
    )`
  );

  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `owner_user_id` INT UNSIGNED NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `wa_status` VARCHAR(32) NOT NULL DEFAULT 'disconnected'"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `wa_qr_data_url` MEDIUMTEXT NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `wa_connected_at` DATETIME NULL"
  );

  if (await columnExists(sequelize, "businesses", "wa_connected_at")) {
    await runSqlOptional(
      sequelize,
      `UPDATE \`businesses\` SET \`wa_connected_at\` = NOW()
       WHERE \`wa_status\` = 'ready' AND \`wa_connected_at\` IS NULL`
    );
  }
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `ai_instructions` JSON NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `anthropic_api_key` TEXT NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `ai_auto_reply_enabled` TINYINT(1) NOT NULL DEFAULT 1"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `order_requirements` JSON NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `currency` VARCHAR(8) NOT NULL DEFAULT 'PKR'"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `plan` VARCHAR(32) NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `billing_status` VARCHAR(32) NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `period_ends_at` DATETIME NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `whop_membership_id` VARCHAR(128) NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `billing_email_sent_at` DATETIME NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `billing_notice_key` VARCHAR(32) NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `api_access_enabled` TINYINT(1) NOT NULL DEFAULT 0"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `usage_period_start` DATETIME NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `subscription_started_at` DATETIME NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `cancel_at_period_end` TINYINT(1) NOT NULL DEFAULT 0"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `quota_ai_bonus` INT UNSIGNED NOT NULL DEFAULT 0"
  );
  await addColumnIfMissing(
    sequelize,
    "businesses",
    "ADD COLUMN `quota_contacts_bonus` INT UNSIGNED NOT NULL DEFAULT 0"
  );

  await runSqlOptional(
    sequelize,
    `UPDATE \`businesses\` SET \`api_access_enabled\` = 1 WHERE LOWER(\`plan\`) = 'enterprise'`
  );

  if (await columnExists(sequelize, "businesses", "billing_email_sent_at")) {
    await runSqlOptional(
      sequelize,
      `UPDATE \`businesses\` SET \`billing_notice_key\` = 'trial_expired'
       WHERE \`billing_notice_key\` IS NULL
         AND \`billing_email_sent_at\` IS NOT NULL
         AND (\`billing_status\` = 'trial_expired' OR \`billing_status\` = 'trial_active')`
    );
  }

  if (await tableExists(sequelize, "businesses")) {
    if (await columnExists(sequelize, "businesses", "subscription_status")) {
      await runSqlOptional(
        sequelize,
        `UPDATE \`businesses\` SET
          \`billing_status\` = CASE
            WHEN \`subscription_status\` = 'active' THEN 'active'
            WHEN \`subscription_status\` = 'renewal_failed' THEN 'renewal_failed'
            WHEN \`subscription_status\` IN ('expired') THEN 'expired'
            WHEN \`trial_ends_at\` IS NOT NULL AND \`trial_ends_at\` > NOW()
              AND (\`subscription_status\` IS NULL OR \`subscription_status\` = '') THEN 'trial_active'
            WHEN \`trial_ends_at\` IS NOT NULL AND \`trial_ends_at\` <= NOW()
              AND (\`subscription_status\` IS NULL OR \`subscription_status\` = '' OR \`subscription_status\` = 'expired') THEN 'trial_expired'
            ELSE \`billing_status\`
          END
        WHERE \`billing_status\` IS NULL`
      );
    }
    if (await columnExists(sequelize, "businesses", "subscription_plan")) {
      await runSqlOptional(
        sequelize,
        `UPDATE \`businesses\` SET
          \`plan\` = COALESCE(\`subscription_plan\`, CASE WHEN \`trial_ends_at\` IS NOT NULL THEN 'trial' END)
        WHERE \`plan\` IS NULL`
      );
    }
    if (
      (await columnExists(sequelize, "businesses", "subscription_ends_at")) ||
      (await columnExists(sequelize, "businesses", "trial_ends_at"))
    ) {
      await runSqlOptional(
        sequelize,
        `UPDATE \`businesses\` SET
          \`period_ends_at\` = COALESCE(\`subscription_ends_at\`, \`trial_ends_at\`)
        WHERE \`period_ends_at\` IS NULL`
      );
    }
    if (await columnExists(sequelize, "businesses", "whop_subscription_id")) {
      await runSqlOptional(
        sequelize,
        `UPDATE \`businesses\` SET \`whop_membership_id\` = \`whop_subscription_id\`
         WHERE \`whop_membership_id\` IS NULL AND \`whop_subscription_id\` IS NOT NULL`
      );
    }
    if (await columnExists(sequelize, "businesses", "access_notice_sent_at")) {
      await runSqlOptional(
        sequelize,
        `UPDATE \`businesses\` SET \`billing_email_sent_at\` = \`access_notice_sent_at\`
         WHERE \`billing_email_sent_at\` IS NULL AND \`access_notice_sent_at\` IS NOT NULL`
      );
    }
    if (await columnExists(sequelize, "businesses", "access_blocked_reason")) {
      await runSqlOptional(
        sequelize,
        `UPDATE \`businesses\` SET \`billing_status\` = \`access_blocked_reason\`
         WHERE \`billing_status\` IS NULL AND \`access_blocked_reason\` IS NOT NULL`
      );
    }
  }

  const dropLegacyBillingColumns = [
    "trial_started_at",
    "trial_ends_at",
    "subscription_plan",
    "subscription_status",
    "subscription_ends_at",
    "whop_subscription_id",
    "whop_user_id",
    "access_blocked_reason",
    "access_blocked_at",
    "access_notice_sent_at",
  ];
  for (const col of dropLegacyBillingColumns) {
    await dropColumnIfExists(sequelize, "businesses", col);
  }

  await addColumnIfMissing(
    sequelize,
    "completed_orders",
    "ADD COLUMN `status` VARCHAR(16) NOT NULL DEFAULT 'complete'"
  );
  await addColumnIfMissing(
    sequelize,
    "completed_orders",
    "ADD COLUMN `order_group_id` VARCHAR(36) NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "completed_orders",
    "ADD COLUMN `order_payment_proof` MEDIUMTEXT NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "completed_orders",
    "ADD COLUMN `delivery_payment_proof` MEDIUMTEXT NULL"
  );

  if (await tableExists(sequelize, "completed_orders")) {
    await runSqlOptional(
      sequelize,
      "ALTER TABLE `completed_orders` MODIFY COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'complete'"
    );
  }

  await runSqlOptional(
    sequelize,
    `CREATE TABLE IF NOT EXISTS \`order_action_logs\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`business_id\` INT UNSIGNED NOT NULL,
      \`order_group_id\` VARCHAR(36) NULL,
      \`lead_order_id\` INT UNSIGNED NULL,
      \`action_type\` VARCHAR(64) NOT NULL,
      \`previous_status\` VARCHAR(32) NULL,
      \`new_status\` VARCHAR(32) NULL,
      \`performed_by\` VARCHAR(16) NOT NULL DEFAULT 'system',
      \`performed_by_user_id\` INT UNSIGNED NULL,
      \`notes\` TEXT NULL,
      \`metadata\` JSON NULL,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`order_action_logs_business_group\` (\`business_id\`, \`order_group_id\`),
      KEY \`order_action_logs_business_created\` (\`business_id\`, \`created_at\`)
    )`
  );

  await runSqlOptional(
    sequelize,
    `CREATE TABLE IF NOT EXISTS \`customer_order_sessions\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`business_id\` INT UNSIGNED NOT NULL,
      \`customer_wa_id\` VARCHAR(32) NOT NULL,
      \`committed\` TINYINT(1) NOT NULL DEFAULT 0,
      \`cart_json\` TEXT NULL,
      \`delivery_address\` TEXT NULL,
      \`delivery_payment_proof\` MEDIUMTEXT NULL,
      \`order_payment_proof\` MEDIUMTEXT NULL,
      \`order_group_id\` VARCHAR(36) NULL,
      \`placed_at\` DATETIME NULL,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`customer_order_session_business_customer\` (\`business_id\`, \`customer_wa_id\`)
    )`
  );

  await addColumnIfMissing(
    sequelize,
    "whatsapp_messages",
    "ADD COLUMN `business_id` INT UNSIGNED NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "whatsapp_messages",
    "ADD COLUMN `outgoing_source` VARCHAR(16) NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "whatsapp_messages",
    "ADD COLUMN `whatsapp_chat_id` VARCHAR(64) NULL"
  );
  await addColumnIfMissing(
    sequelize,
    "whatsapp_messages",
    "ADD COLUMN `wa_message_key` VARCHAR(128) NULL"
  );

  if (await tableExists(sequelize, "whatsapp_messages")) {
    if (await columnExists(sequelize, "whatsapp_messages", "business_phone_number_id")) {
      if (await columnExists(sequelize, "businesses", "phone_number_id")) {
        await runSqlOptional(
          sequelize,
          `UPDATE \`whatsapp_messages\` m
           INNER JOIN \`businesses\` b ON m.\`business_phone_number_id\` = b.\`phone_number_id\`
           SET m.\`business_id\` = b.\`id\`
           WHERE m.\`business_id\` IS NULL AND m.\`business_phone_number_id\` IS NOT NULL`
        );
      }
      await runSqlOptional(
        sequelize,
        `UPDATE \`whatsapp_messages\` m
         SET m.\`business_id\` = CAST(SUBSTRING(m.\`business_phone_number_id\`, 5) AS UNSIGNED)
         WHERE m.\`business_id\` IS NULL
           AND m.\`business_phone_number_id\` LIKE 'biz_%'`
      );
    }
  }

  await addColumnIfMissing(
    sequelize,
    "whatsapp_follow_ups",
    "ADD COLUMN `business_id` INT UNSIGNED NULL"
  );

  if (await tableExists(sequelize, "whatsapp_follow_ups")) {
    if (
      await columnExists(sequelize, "whatsapp_follow_ups", "business_phone_number_id")
    ) {
      if (await columnExists(sequelize, "businesses", "phone_number_id")) {
        await runSqlOptional(
          sequelize,
          `UPDATE \`whatsapp_follow_ups\` f
           INNER JOIN \`businesses\` b ON f.\`business_phone_number_id\` = b.\`phone_number_id\`
           SET f.\`business_id\` = b.\`id\`
           WHERE f.\`business_id\` IS NULL`
        );
      }
      await runSqlOptional(
        sequelize,
        `UPDATE \`whatsapp_follow_ups\` f
         SET f.\`business_id\` = CAST(SUBSTRING(f.\`business_phone_number_id\`, 5) AS UNSIGNED)
         WHERE f.\`business_id\` IS NULL
           AND f.\`business_phone_number_id\` LIKE 'biz_%'`
      );
    }
  }

  if (
    (await tableExists(sequelize, "whatsapp_messages")) &&
    (await columnExists(sequelize, "whatsapp_messages", "business_id"))
  ) {
    await runSqlOptional(
      sequelize,
      "CREATE INDEX `whatsapp_messages_business_id_sender_wa_id` ON `whatsapp_messages` (`business_id`, `sender_wa_id`)"
    );
  }
  if (
    (await tableExists(sequelize, "whatsapp_messages")) &&
    (await columnExists(sequelize, "whatsapp_messages", "wa_message_key"))
  ) {
    await runSqlOptional(
      sequelize,
      "CREATE UNIQUE INDEX `whatsapp_messages_business_wa_key_unique` ON `whatsapp_messages` (`business_id`, `wa_message_key`)"
    );
  }

  if (await tableExists(sequelize, "blocked_contacts")) {
    await runSqlOptional(
      sequelize,
      "CREATE UNIQUE INDEX `blocked_contacts_business_wa_unique` ON `blocked_contacts` (`business_id`, `normalized_wa_id`)"
    );
  }

  const dropBusinessColumns = [
    "phone_number_id",
    "business_account_id",
    "whatsapp_token",
    "webhook_verify_token",
    "products",
    "user_id",
    "status",
    "needs_reconnect",
  ];
  for (const col of dropBusinessColumns) {
    await dropColumnIfExists(sequelize, "businesses", col);
  }

  await dropColumnIfExists(
    sequelize,
    "whatsapp_messages",
    "business_phone_number_id"
  );

  await dropColumnIfExists(
    sequelize,
    "whatsapp_follow_ups",
    "business_phone_number_id"
  );

  await runSqlOptional(
    sequelize,
    `CREATE TABLE IF NOT EXISTS \`whatsapp_follow_ups\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`business_id\` INT UNSIGNED NOT NULL,
      \`customer_wa_id\` VARCHAR(32) NOT NULL,
      \`contact_raw_wa_id\` VARCHAR(32) NOT NULL,
      \`product_id\` INT UNSIGNED NOT NULL,
      \`product_name\` VARCHAR(255) NOT NULL,
      \`bargain_price\` DECIMAL(12,2) NOT NULL,
      \`customer_price\` DECIMAL(12,2) NOT NULL,
      \`scheduled_at\` DATETIME NOT NULL,
      \`anchor_at\` DATETIME NOT NULL,
      \`last_incoming_message_id\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
      \`sent_at\` DATETIME NULL,
      \`status\` VARCHAR(16) NOT NULL DEFAULT 'pending',
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`wa_follow_up_pending\` (\`status\`, \`scheduled_at\`),
      KEY \`wa_follow_up_contact\` (\`business_id\`, \`customer_wa_id\`, \`status\`)
    )`
  );
  });
}
