SET @col_exists := (
	SELECT COUNT(*)
	FROM INFORMATION_SCHEMA.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE()
		AND TABLE_NAME = 'service'
		AND COLUMN_NAME = 'ativo'
);

SET @sql := IF(
	@col_exists = 0,
	'ALTER TABLE `service` ADD COLUMN `ativo` TINYINT(1) NOT NULL DEFAULT 1 AFTER `description`',
	'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
