SET @has_promotions := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'promotions'
);

SET @valid_until_nullable := (
    SELECT IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'promotions'
      AND COLUMN_NAME = 'valid_until'
    LIMIT 1
);

SET @sql := IF(
    @has_promotions > 0 AND @valid_until_nullable = 'NO',
    'ALTER TABLE promotions MODIFY COLUMN valid_until DATE NULL',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
