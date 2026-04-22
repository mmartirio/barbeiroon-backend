-- Corrige typo de coluna tenat_id -> tenant_id e garante existência de tenant_id em service

SET @has_tenat_id := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'service'
    AND COLUMN_NAME = 'tenat_id'
);

SET @has_tenant_id := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'service'
    AND COLUMN_NAME = 'tenant_id'
);

-- Se só existir tenat_id, renomeia para tenant_id
SET @rename_sql := IF(
  @has_tenat_id > 0 AND @has_tenant_id = 0,
  'ALTER TABLE `service` CHANGE COLUMN `tenat_id` `tenant_id` INT NULL;',
  'SELECT 1;'
);
PREPARE stmt_rename FROM @rename_sql;
EXECUTE stmt_rename;
DEALLOCATE PREPARE stmt_rename;

-- Recalcula após possível rename
SET @has_tenant_id := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'service'
    AND COLUMN_NAME = 'tenant_id'
);

-- Se ainda não existir tenant_id, cria
SET @add_sql := IF(
  @has_tenant_id = 0,
  'ALTER TABLE `service` ADD COLUMN `tenant_id` INT NULL AFTER `description`;',
  'SELECT 1;'
);
PREPARE stmt_add FROM @add_sql;
EXECUTE stmt_add;
DEALLOCATE PREPARE stmt_add;

-- Garante índice para performance dos filtros por tenant
SET @has_idx_tenant := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'service'
    AND INDEX_NAME = 'idx_service_tenant_id'
);

SET @idx_sql := IF(
  @has_idx_tenant = 0,
  'ALTER TABLE `service` ADD INDEX `idx_service_tenant_id` (`tenant_id`);',
  'SELECT 1;'
);
PREPARE stmt_idx FROM @idx_sql;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;
