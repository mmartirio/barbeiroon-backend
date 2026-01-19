-- Migration para permitir NULL no campo cliente da tabela service
ALTER TABLE `service`
MODIFY COLUMN `cliente` VARCHAR(255) NULL;
