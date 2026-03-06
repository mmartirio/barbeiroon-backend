-- Cria tabela de solicitacoes de agendamento
CREATE TABLE IF NOT EXISTS `appointment_requests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL,
  `customer_phone` VARCHAR(20) NOT NULL,
  `service_id` INT NOT NULL,
  `professional_id` INT NOT NULL,
  `appointment_date` DATE NOT NULL,
  `appointment_time` TIME NOT NULL,
  `duration_minutes` INT NOT NULL,
  `status` ENUM('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending',
  `expires_at` DATETIME NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_appt_req_tenant` (`tenant_id`),
  INDEX `idx_appt_req_professional` (`professional_id`),
  INDEX `idx_appt_req_status` (`status`)
);
