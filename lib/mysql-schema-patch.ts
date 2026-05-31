import type { Sequelize } from "sequelize";

/** MySQL: duplicate column name */
const ER_DUP_FIELDNAME = 1060;
/** MySQL: duplicate key name (e.g. index already exists) */
const ER_DUP_KEYNAME = 1061;

function shouldIgnoreMysqlPatchError(e: unknown): boolean {
  const ex = e as {
    parent?: { errno?: number; code?: string; sqlMessage?: string };
    original?: { errno?: number };
  };
  const errno = ex.parent?.errno ?? ex.original?.errno;
  const msg = String(ex.parent?.sqlMessage ?? (e as Error)?.message ?? "");
  if (
    errno === ER_DUP_FIELDNAME ||
    errno === ER_DUP_KEYNAME ||
    ex.parent?.code === "ER_DUP_FIELDNAME" ||
    ex.parent?.code === "ER_DUP_KEYNAME" ||
    /duplicate column/i.test(msg) ||
    /duplicate key name/i.test(msg)
  ) {
    return true;
  }
  return false;
}

async function tryMysqlPatch(sequelize: Sequelize, sql: string): Promise<void> {
  try {
    await sequelize.query(sql);
  } catch (e: unknown) {
    if (shouldIgnoreMysqlPatchError(e)) {
      return;
    }
    throw e;
  }
}

/**
 * `sequelize.sync()` does not add columns to existing tables. Apply safe,
 * idempotent DDL. Unique indexes on `blocked_contacts` are defined here with
 * real MySQL column names (`business_id`), because Sequelize's model `indexes`
 * option can emit camelCase names in ALTERs and break on live MySQL.
 */
export async function patchMysqlSchema(sequelize: Sequelize): Promise<void> {
  if (sequelize.getDialect() !== "mysql") {
    return;
  }

  await tryMysqlPatch(
    sequelize,
    "ALTER TABLE `whatsapp_messages` ADD COLUMN `outgoing_source` VARCHAR(16) NULL"
  );

  await tryMysqlPatch(
    sequelize,
    "ALTER TABLE `businesses` ADD COLUMN `ai_instructions` JSON NULL"
  );

  await tryMysqlPatch(
    sequelize,
    "CREATE UNIQUE INDEX `blocked_contacts_business_wa_unique` ON `blocked_contacts` (`business_id`, `normalized_wa_id`)"
  );

  await tryMysqlPatch(
    sequelize,
    "ALTER TABLE `businesses` ADD COLUMN `anthropic_api_key` TEXT NULL"
  );

  await tryMysqlPatch(
    sequelize,
    "ALTER TABLE `businesses` ADD COLUMN `webhook_verify_token` VARCHAR(64) NULL"
  );

  await tryMysqlPatch(
    sequelize,
    "ALTER TABLE `completed_orders` ADD COLUMN `customer_wa_id` VARCHAR(32) NULL"
  );
  await tryMysqlPatch(
    sequelize,
    "ALTER TABLE `completed_orders` ADD COLUMN `delivery_note` TEXT NULL"
  );
  await tryMysqlPatch(
    sequelize,
    "ALTER TABLE `completed_orders` ADD COLUMN `order_source` VARCHAR(16) NULL DEFAULT 'manual'"
  );

  await tryMysqlPatch(
    sequelize,
    `CREATE TABLE IF NOT EXISTS \`whatsapp_follow_ups\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`business_id\` INT UNSIGNED NOT NULL,
      \`business_phone_number_id\` VARCHAR(64) NOT NULL,
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

  await tryMysqlPatch(
    sequelize,
    "ALTER TABLE `whatsapp_follow_ups` ADD COLUMN `last_incoming_message_id` BIGINT UNSIGNED NOT NULL DEFAULT 0"
  );

  await tryMysqlPatch(
    sequelize,
    "ALTER TABLE `businesses` ADD COLUMN `needs_reconnect` TINYINT(1) NOT NULL DEFAULT 0"
  );

  await tryMysqlPatch(
    sequelize,
    "UPDATE `businesses` SET `needs_reconnect` = 1 WHERE `phone_number_id` = '1168439009678465'"
  );
}
