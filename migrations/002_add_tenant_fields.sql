-- Migration para adicionar novos campos ao tenant (barbearia)
-- Adiciona campos de CNPJ, endereço completo, dados do proprietário, etc.

-- ====================================
-- Adicionar novas colunas à tabela tenants
-- ====================================

ALTER TABLE `tenants`
-- Dados da empresa
ADD COLUMN `company_name` VARCHAR(200) COMMENT 'Razão social' AFTER `name`,
ADD COLUMN `cnpj` VARCHAR(18) UNIQUE COMMENT 'CNPJ formatado' AFTER `company_name`,
ADD COLUMN `phone` VARCHAR(20) COMMENT 'Telefone da barbearia' AFTER `email`,

-- Endereço completo
ADD COLUMN `address` VARCHAR(200) COMMENT 'Rua, número, complemento' AFTER `phone`,
ADD COLUMN `neighborhood` VARCHAR(100) COMMENT 'Bairro' AFTER `address`,
ADD COLUMN `city` VARCHAR(100) COMMENT 'Cidade' AFTER `neighborhood`,
ADD COLUMN `state` VARCHAR(2) COMMENT 'UF' AFTER `city`,
ADD COLUMN `zip_code` VARCHAR(10) COMMENT 'CEP' AFTER `state`,

-- Dados do proprietário
ADD COLUMN `owner_name` VARCHAR(100) COMMENT 'Nome do proprietário' AFTER `zip_code`,
ADD COLUMN `owner_email` VARCHAR(100) COMMENT 'Email do proprietário' AFTER `owner_name`,
ADD COLUMN `owner_phone` VARCHAR(20) COMMENT 'Telefone do proprietário' AFTER `owner_email`,

-- Status e configurações
ADD COLUMN `is_active` BOOLEAN DEFAULT TRUE COMMENT 'Se a barbearia está ativa' AFTER `backgroundImage`,
ADD COLUMN `plan_type` ENUM('free', 'basic', 'premium', 'enterprise') DEFAULT 'free' COMMENT 'Tipo de plano' AFTER `is_active`;

-- Renomear coluna backgroundImage para seguir padrão snake_case (opcional)
ALTER TABLE `tenants` 
CHANGE COLUMN `backgroundImage` `background_image` TEXT COMMENT 'Imagem de fundo';

-- Adicionar índices para melhor performance
ALTER TABLE `tenants`
ADD INDEX idx_cnpj (`cnpj`),
ADD INDEX idx_slug (`slug`),
ADD INDEX idx_is_active (`is_active`),
ADD INDEX idx_city_state (`city`, `state`);

-- ====================================
-- Verificações
-- ====================================

-- Ver estrutura atualizada da tabela
DESCRIBE `tenants`;

-- Contar tenants ativos
SELECT 
    plan_type,
    is_active,
    COUNT(*) as total
FROM `tenants`
GROUP BY plan_type, is_active;
