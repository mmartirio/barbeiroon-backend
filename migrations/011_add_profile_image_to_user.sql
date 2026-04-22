SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user'
      AND COLUMN_NAME = 'profile_image_id'
);

SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE `user` ADD COLUMN `profile_image_id` INT NULL AFTER `is_barber`',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
