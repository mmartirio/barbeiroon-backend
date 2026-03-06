-- Cria tabela para configuracoes de expediente
CREATE TABLE IF NOT EXISTS `agenda_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL,
  `professional_id` INT NULL,
  `inicio_expediente` TIME NOT NULL,
  `fim_expediente` TIME NOT NULL,
  `inicio_almoco` TIME NULL,
  `fim_almoco` TIME NULL,
  `dias_calendario` TEXT NULL,
  `dias_selecionados` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_agenda_settings_tenant` (`tenant_id`),
  INDEX `idx_agenda_settings_professional` (`professional_id`)
);
