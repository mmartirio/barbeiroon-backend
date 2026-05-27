# Barbeiro On — Backend

API REST do sistema **Barbeiro On**, uma plataforma SaaS multi-tenant para gestão de barbearias. Construída com Node.js, Express e MySQL via Sequelize.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| ORM | Sequelize 6 + MySQL 2 |
| Autenticação | JWT (jsonwebtoken) |
| Hash de senha | bcryptjs |
| Upload de arquivos | Multer 2 |
| E-mail | Nodemailer |
| Rate limit | express-rate-limit |
| Cache em memória | node-cache |
| Processo em produção | PM2 |
| Proxy reverso | Nginx |

---

## Estrutura do Projeto

```
backend/
├── config/
│   └── db.js                  # Configuração do Sequelize
├── controllers/               # Lógica de negócio por domínio
├── middlewares/
│   ├── authMiddleware.js      # Verificação JWT
│   ├── checkPermission.js     # RBAC por grupo
│   ├── tenantMiddleware.js    # Isolamento multi-tenant
│   └── upload.js              # Multer com whitelist de extensão e MIME
├── models/                    # Entidades Sequelize
│   ├── Tenant.js
│   ├── User.js
│   ├── Group.js
│   ├── Customer.js
│   ├── Appointment.js
│   ├── Service.js
│   ├── Professional.js
│   ├── Promotion.js
│   ├── Voucher.js
│   ├── Agenda.js
│   ├── Report.js
│   ├── Plan.js
│   ├── PaymentMethod.js
│   ├── GestorAdmin.js
│   └── associations.js
├── routes/                    # Rotas por domínio
├── services/
│   └── reminderService.js     # Serviço de lembretes por WhatsApp
├── utils/
│   └── cacheMiddleware.js
├── uploads/                   # Arquivos enviados (não versionar)
├── .env.example
├── Server.js                  # Entry point
└── seedDefault.js
```

---

## Pré-requisitos

- Node.js 20
- MySQL 8
- PM2 (`npm install -g pm2`)
- Nginx

---

## Configuração Local

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/mmartirio/barbeiroon-backend.git
cd barbeiroon-backend
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com os valores corretos:

```env
PORT=3001
NODE_ENV=development

# Banco de dados
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=meu_barbeiro
DB_DIALECT=mysql

# JWT — use uma string longa e aleatória
JWT_SECRET=sua_chave_secreta_super_segura_aqui

# URL do frontend (usada em links de e-mail)
FRONTEND_URL=http://localhost:3000

# E-mail (Gmail com senha de aplicativo)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app-do-gmail
EMAIL_FROM="Barbeiro On <noreply@barbeiroon.com>"

# WhatsApp (opcional — CallMeBot)
WHATSAPP_PROVIDER=callmebot
WHATSAPP_CALLMEBOT_API_KEY=sua_api_key
```

### 3. Criar banco de dados

```sql
CREATE DATABASE meu_barbeiro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Iniciar em modo desenvolvimento

```bash
npm run dev
```

O servidor sobe em `http://localhost:3001` e sincroniza as tabelas automaticamente na primeira execução.

---

## Deploy na Locaweb Cloud Server (Ubuntu 24.04)

### 1. Instalar Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # deve exibir v20.x
```

### 2. Instalar PM2 e Nginx

```bash
sudo npm install -g pm2
sudo apt install -y nginx
```

### 3. Instalar e configurar MySQL

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

Criar banco e usuário:

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE meu_barbeiro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'barbeiro'@'localhost' IDENTIFIED BY 'SuaSenhaForte@2026';
GRANT ALL PRIVILEGES ON meu_barbeiro.* TO 'barbeiro'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Clonar o repositório no servidor

```bash
cd /var/www
sudo git clone https://github.com/mmartirio/barbeiroon-backend.git barbeiroon-backend
sudo chown -R $USER:$USER /var/www/barbeiroon-backend
cd /var/www/barbeiroon-backend
npm install --omit=dev
```

### 5. Configurar variáveis de ambiente em produção

```bash
cp .env.example .env
nano .env
```

Configure:

```env
PORT=3001
NODE_ENV=production

DB_HOST=localhost
DB_USER=barbeiro
DB_PASSWORD=SuaSenhaForte@2026
DB_NAME=meu_barbeiro
DB_DIALECT=mysql

JWT_SECRET=chave_muito_longa_e_aleatoria_para_producao

FRONTEND_URL=https://barbeiroon.vercel.app

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app-do-gmail
EMAIL_FROM="Barbeiro On <noreply@barbeiroon.com>"
```

### 6. Iniciar com PM2

```bash
pm2 start Server.js --name barbeiroon-backend
pm2 save
pm2 startup
# Execute o comando que o PM2 imprimir para auto-start no boot
```

Verificar status:

```bash
pm2 status
pm2 logs barbeiroon-backend
```

### 7. Configurar Nginx como proxy reverso

```bash
sudo nano /etc/nginx/sites-available/barbeiroon-backend
```

```nginx
server {
    listen 80;
    server_name api.barbeiroon.com.br;  # substitua pelo seu domínio/IP

    # Tamanho máximo de upload (deve ser >= limite do Multer: 5MB)
    client_max_body_size 6M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/barbeiroon-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL com Certbot (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.barbeiroon.com.br
```

O Certbot configura HTTPS e renova o certificado automaticamente.

### 9. Liberar porta no firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Atualizar o servidor após push

```bash
cd /var/www/barbeiroon-backend
git pull origin main
npm install --omit=dev
pm2 restart barbeiroon-backend
```

---

## Endpoints Principais

### Públicos (sem autenticação)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/tenant/:slug` | Dados públicos do tenant |
| POST | `/api/auth/login` | Login do usuário |
| POST | `/api/auth/register` | Registro de novo tenant |
| GET | `/api/public/service/:slug` | Serviços do tenant |
| GET | `/api/public/professional/:slug` | Profissionais do tenant |
| POST | `/api/public/appointment` | Criar agendamento (público) |
| GET | `/api/public/promotion/:slug` | Promoções ativas |

### Autenticados (JWT obrigatório)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST/PUT/DELETE | `/api/user` | Gestão de usuários |
| GET/POST/PUT/DELETE | `/api/customer` | Gestão de clientes |
| GET/POST/PUT/DELETE | `/api/service` | Gestão de serviços |
| GET/POST/PUT/DELETE | `/api/professional` | Gestão de profissionais |
| GET/POST/PUT/DELETE | `/api/appointment` | Gestão de agendamentos |
| GET/POST/PUT/DELETE | `/api/promotion` | Gestão de promoções |
| GET | `/api/agenda` | Agenda e horários |
| GET | `/api/report` | Relatórios |
| GET | `/api/dashboard` | Dados do dashboard |

### Gestor (Super Admin)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/gestor/login` | Login do gestor |
| GET | `/api/gestor/tenants` | Listar todas as barbearias |
| GET/POST/PUT/DELETE | `/api/gestor/plans` | Gestão de planos |
| GET/POST/PUT/DELETE | `/api/gestor/admins` | Gestão de admins do gestor |

---

## Segurança Implementada

- **JWT** com expiração configurável
- **RBAC** por grupo (permissões por role)
- **Multi-tenant** via `X-Tenant-Slug` header — isolamento completo de dados
- **Rate limiting** nas rotas de autenticação
- **Upload seguro**: whitelist de extensões (jpg, png, gif, webp) + validação de MIME type + sanitização de nome de arquivo
- **Payload limit**: 200 KB no body JSON
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`
- **HSTS** em produção
- `X-Powered-By` desabilitado

---

## Variáveis de Ambiente — Referência Completa

| Variável | Obrigatório | Descrição |
|----------|------------|-----------|
| `PORT` | Não | Porta do servidor (padrão: 3001) |
| `NODE_ENV` | Sim | `development` ou `production` |
| `DB_HOST` | Sim | Host do MySQL |
| `DB_USER` | Sim | Usuário do MySQL |
| `DB_PASSWORD` | Sim | Senha do MySQL |
| `DB_NAME` | Sim | Nome do banco de dados |
| `DB_DIALECT` | Sim | `mysql` |
| `JWT_SECRET` | Sim | Chave secreta para assinar tokens JWT |
| `FRONTEND_URL` | Sim | URL do frontend (links em e-mails) |
| `EMAIL_HOST` | Não | Servidor SMTP |
| `EMAIL_PORT` | Não | Porta SMTP (587 para TLS) |
| `EMAIL_USER` | Não | Usuário SMTP |
| `EMAIL_PASS` | Não | Senha ou senha de app |
| `EMAIL_FROM` | Não | Remetente dos e-mails |
| `WHATSAPP_PROVIDER` | Não | `callmebot` ou `meta` |
| `WHATSAPP_CALLMEBOT_API_KEY` | Não | API key do CallMeBot |
| `WHATSAPP_ACCESS_TOKEN` | Não | Token da Meta Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | Não | Phone Number ID da Meta |

---

## Licença

Proprietário — todos os direitos reservados.
