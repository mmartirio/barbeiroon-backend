# Meu-Barbeiro - Backend

Este diretório contém o backend do sistema Meu-Barbeiro, responsável pela API, banco de dados e regras de negócio.

## Tecnologias
- Node.js
- Express.js
- Sequelize (MySQL)
- Docker

## Instalação
1. Acesse a pasta backend:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure o banco de dados em `config/db.js`.
4. Execute as migrações SQL em `/backend/migrations` no seu MySQL.
5. Inicie o servidor:
   ```bash
   npm start
   ```

## Principais scripts
- `npm start`: Inicia o backend
- `npm run dev`: Inicia com nodemon

## Estrutura

```
backend/
├── controllers/    # Lógica das rotas
├── models/         # Modelos Sequelize
├── routes/         # Rotas da API
├── migrations/     # Scripts SQL
├── config/         # Configuração do banco
├── package.json    # Dependências do backend
└── ...
```

## Endpoints principais
- `/api/agenda` - Configuração de expediente
- `/api/agenda/indisponibilidade` - Indisponibilidade
- `/api/agenda/encerramento-antecipado` - Encerramento antecipado

## Variáveis de ambiente
Configure as variáveis de ambiente no arquivo `.env` se necessário.
