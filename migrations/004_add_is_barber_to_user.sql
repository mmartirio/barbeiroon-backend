-- Adiciona coluna is_barber à tabela user
ALTER TABLE `user` ADD COLUMN `is_barber` BOOLEAN DEFAULT FALSE AFTER `is_active`;
