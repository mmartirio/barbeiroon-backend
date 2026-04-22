CREATE TABLE IF NOT EXISTS promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    price_type VARCHAR(20) NOT NULL DEFAULT 'fixo',
    discount_type VARCHAR(40) NOT NULL DEFAULT 'desconto_compra',
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    criteria TEXT NULL,
    x_purchases INT NULL,
    service_x VARCHAR(120) NULL,
    customer_count INT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_promotions_tenant_dates (tenant_id, valid_from, valid_until),
    CONSTRAINT fk_promotions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
