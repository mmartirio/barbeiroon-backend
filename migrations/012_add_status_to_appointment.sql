SET @column_exists := (
	SELECT COUNT(*)
	FROM INFORMATION_SCHEMA.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE()
		AND TABLE_NAME = 'appointment'
		AND COLUMN_NAME = 'status'
);

SET @ddl := IF(
	@column_exists = 0,
	'ALTER TABLE appointment ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''agendado'' AFTER appointment_time',
	'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE appointment
SET status = 'pendente';
