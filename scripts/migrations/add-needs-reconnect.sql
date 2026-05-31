-- Run against your MySQL database (idempotent on MySQL 8+)
ALTER TABLE `businesses`
  ADD COLUMN IF NOT EXISTS `needs_reconnect` TINYINT(1) NOT NULL DEFAULT 0;

UPDATE `businesses`
SET `needs_reconnect` = 1
WHERE `phone_number_id` = '1168439009678465';
