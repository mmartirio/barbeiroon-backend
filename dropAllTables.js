const { sequelize } = require('./config/db');

(async () => {
  try {
    await sequelize.drop();
    console.log('Todas as tabelas foram excluídas com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao excluir tabelas:', error);
    process.exit(1);
  }
})();
