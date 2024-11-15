const sequelize = require('./config/db'); // Certifique-se de que o caminho está correto
const Agenda = require('./models/Agenda'); // Certifique-se de que o caminho está correto

const initializeDatabase = async () => {
    try {
        await sequelize.sync(); // Cria a tabela se não existir
        console.log('Tabela Agenda criada com sucesso.');
    } catch (error) {
        console.error('Erro ao criar a tabela:', error);
    }
};

// Chame a função para inicializar o banco de dados
initializeDatabase();
