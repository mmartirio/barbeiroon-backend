-- Migration para converter sistema de roles para sistema de grupos com permissões granulares
-- Execute este script SOMENTE em ambientes de desenvolvimento/teste ou após backup completo

-- ====================================
-- PASSO 1: Criar tabela de Grupos
-- ====================================

CREATE TABLE IF NOT EXISTS `groups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `tenantId` INT NOT NULL,
  
  -- Permissões de Usuários
  `can_create_user` BOOLEAN DEFAULT FALSE,
  `can_edit_user` BOOLEAN DEFAULT FALSE,
  `can_delete_user` BOOLEAN DEFAULT FALSE,
  `can_view_users` BOOLEAN DEFAULT FALSE,
  
  -- Permissões de Grupos
  `can_manage_groups` BOOLEAN DEFAULT FALSE,
  
  -- Permissões de Clientes
  `can_view_customers` BOOLEAN DEFAULT FALSE,
  `can_create_customer` BOOLEAN DEFAULT FALSE,
  `can_edit_customer` BOOLEAN DEFAULT FALSE,
  `can_delete_customer` BOOLEAN DEFAULT FALSE,
  
  -- Permissões de Agendamentos
  `can_view_appointments` BOOLEAN DEFAULT FALSE,
  `can_create_appointment` BOOLEAN DEFAULT FALSE,
  `can_edit_appointment` BOOLEAN DEFAULT FALSE,
  `can_delete_appointment` BOOLEAN DEFAULT FALSE,
  
  -- Permissões de Serviços
  `can_view_services` BOOLEAN DEFAULT FALSE,
  `can_manage_services` BOOLEAN DEFAULT FALSE,
  
  -- Permissões de Profissionais
  `can_view_professionals` BOOLEAN DEFAULT FALSE,
  `can_manage_professionals` BOOLEAN DEFAULT FALSE,
  
  -- Permissões de Agenda
  `can_view_agenda` BOOLEAN DEFAULT FALSE,
  `can_manage_agenda` BOOLEAN DEFAULT FALSE,
  
  -- Permissões de Relatórios
  `can_view_reports` BOOLEAN DEFAULT FALSE,
  
  -- Permissões de Configurações do Tenant
  `can_manage_tenant` BOOLEAN DEFAULT FALSE,
  
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  INDEX idx_tenant (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================
-- PASSO 2: Criar tabela de Clientes
-- ====================================

CREATE TABLE IF NOT EXISTS `customers` (
  `phone` VARCHAR(20) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `birth_date` DATE,
  `tenant_id` INT NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  INDEX idx_tenant_customer (`tenant_id`),
  INDEX idx_name (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================
-- PASSO 3: Criar grupos padrão para cada tenant
-- ====================================

-- Inserir grupo Administrador para cada tenant existente
INSERT INTO `groups` (`name`, `description`, `tenantId`,
  `can_create_user`, `can_edit_user`, `can_delete_user`, `can_view_users`, `can_manage_groups`,
  `can_view_customers`, `can_create_customer`, `can_edit_customer`, `can_delete_customer`,
  `can_view_appointments`, `can_create_appointment`, `can_edit_appointment`, `can_delete_appointment`,
  `can_view_services`, `can_manage_services`, `can_view_professionals`, `can_manage_professionals`,
  `can_view_agenda`, `can_manage_agenda`, `can_view_reports`, `can_manage_tenant`)
SELECT 'Administrador', 'Acesso total ao sistema', `id`,
  TRUE, TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE
FROM `tenants`;

-- Inserir grupo Barbeiro para cada tenant existente
INSERT INTO `groups` (`name`, `description`, `tenantId`,
  `can_create_user`, `can_edit_user`, `can_delete_user`, `can_view_users`, `can_manage_groups`,
  `can_view_customers`, `can_create_customer`, `can_edit_customer`, `can_delete_customer`,
  `can_view_appointments`, `can_create_appointment`, `can_edit_appointment`, `can_delete_appointment`,
  `can_view_services`, `can_manage_services`, `can_view_professionals`, `can_manage_professionals`,
  `can_view_agenda`, `can_manage_agenda`, `can_view_reports`, `can_manage_tenant`)
SELECT 'Barbeiro', 'Visualizar agenda, clientes e serviços', `id`,
  FALSE, FALSE, FALSE, TRUE, FALSE,
  TRUE, TRUE, FALSE, FALSE,
  TRUE, TRUE, TRUE, FALSE,
  TRUE, FALSE, TRUE, FALSE,
  TRUE, FALSE, FALSE, FALSE
FROM `tenants`;

-- Inserir grupo Atendente para cada tenant existente
INSERT INTO `groups` (`name`, `description`, `tenantId`,
  `can_create_user`, `can_edit_user`, `can_delete_user`, `can_view_users`, `can_manage_groups`,
  `can_view_customers`, `can_create_customer`, `can_edit_customer`, `can_delete_customer`,
  `can_view_appointments`, `can_create_appointment`, `can_edit_appointment`, `can_delete_appointment`,
  `can_view_services`, `can_manage_services`, `can_view_professionals`, `can_manage_professionals`,
  `can_view_agenda`, `can_manage_agenda`, `can_view_reports`, `can_manage_tenant`)
SELECT 'Atendente', 'Gerenciar clientes e agendamentos', `id`,
  FALSE, FALSE, FALSE, TRUE, FALSE,
  TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE,
  TRUE, FALSE, TRUE, FALSE,
  TRUE, FALSE, FALSE, FALSE
FROM `tenants`;

-- ====================================
-- PASSO 4: Adicionar coluna groupId à tabela user
-- ====================================

ALTER TABLE `user` 
ADD COLUMN `group_id` INT AFTER `password`,
ADD COLUMN `is_active` BOOLEAN DEFAULT TRUE AFTER `group_id`,
ADD COLUMN `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ====================================
-- PASSO 5: Migrar dados existentes (role -> groupId)
-- ====================================

-- Mapear usuários com role 'admin' para o grupo Administrador
UPDATE `user` u
INNER JOIN `groups` g ON g.tenantId = u.tenantId AND g.name = 'Administrador'
SET u.group_id = g.id
WHERE u.role = 'admin';

-- Mapear usuários com role 'barbeiro' para o grupo Barbeiro
UPDATE `user` u
INNER JOIN `groups` g ON g.tenantId = u.tenantId AND g.name = 'Barbeiro'
SET u.group_id = g.id
WHERE u.role = 'barbeiro';

-- Mapear usuários com role 'cliente' para o grupo Atendente (já que clientes agora são tabela separada)
UPDATE `user` u
INNER JOIN `groups` g ON g.tenantId = u.tenantId AND g.name = 'Atendente'
SET u.group_id = g.id
WHERE u.role = 'cliente' OR u.role IS NULL;

-- ====================================
-- PASSO 6: Adicionar foreign key
-- ====================================

ALTER TABLE `user`
ADD CONSTRAINT `fk_user_group` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE RESTRICT;

-- ====================================
-- PASSO 7: Remover coluna role (ATENÇÃO: Só execute após verificar que a migração funcionou)
-- ====================================

-- DESCOMENTAR APENAS APÓS VERIFICAR QUE TUDO ESTÁ FUNCIONANDO:
-- ALTER TABLE `user` DROP COLUMN `role`;

-- ====================================
-- PASSO 8: Atualizar tabela appointment
-- ====================================

-- Adicionar nova coluna customer_phone
ALTER TABLE `appointment` 
ADD COLUMN `customer_phone` VARCHAR(20) AFTER `id`;

-- Migrar dados de userId para customers (opcional, dependendo da sua estratégia)
-- Opção 1: Criar clientes a partir dos dados de user existentes
-- Opção 2: Manter appointments órfãos e deixar que sejam recriados

-- ATENÇÃO: Esta parte requer decisão de negócio
-- Se quiser migrar usuários antigos para clientes:
/*
INSERT INTO `customers` (`phone`, `name`, `tenant_id`)
SELECT CONCAT('55', LPAD(id, 9, '0')), name, tenantId 
FROM `user` 
WHERE role = 'cliente'
ON DUPLICATE KEY UPDATE name = VALUES(name);

UPDATE `appointment` a
INNER JOIN `user` u ON a.userId = u.id
SET a.customer_phone = CONCAT('55', LPAD(u.id, 9, '0'));
*/

-- Adicionar foreign key para customer_phone
ALTER TABLE `appointment`
ADD CONSTRAINT `fk_appointment_customer` FOREIGN KEY (`customer_phone`) REFERENCES `customers`(`phone`) ON DELETE CASCADE;

-- Remover coluna userId (APENAS APÓS MIGRAÇÃO COMPLETA)
-- DESCOMENTAR APÓS VERIFICAR:
-- ALTER TABLE `appointment` DROP FOREIGN KEY appointment_ibfk_1; -- Ajuste o nome da constraint se necessário
-- ALTER TABLE `appointment` DROP COLUMN `userId`;

-- Renomear outras colunas para snake_case (opcional, para consistência)
ALTER TABLE `appointment` 
CHANGE COLUMN `serviceId` `service_id` INT,
CHANGE COLUMN `professionalId` `professional_id` INT,
CHANGE COLUMN `tenantId` `tenant_id` INT;

-- ====================================
-- VERIFICAÇÕES
-- ====================================

-- Verificar grupos criados
SELECT t.name as tenant, g.name as grupo, COUNT(u.id) as usuarios
FROM `groups` g
LEFT JOIN `user` u ON u.group_id = g.id
INNER JOIN `tenants` t ON g.tenantId = t.id
GROUP BY t.id, g.id
ORDER BY t.name, g.name;

-- Verificar usuários sem grupo
SELECT COUNT(*) as usuarios_sem_grupo 
FROM `user` 
WHERE group_id IS NULL;

-- Verificar clientes cadastrados
SELECT t.name as tenant, COUNT(c.phone) as total_clientes
FROM `tenants` t
LEFT JOIN `customers` c ON c.tenant_id = t.id
GROUP BY t.id;
