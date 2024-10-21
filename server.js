require('dotenv').config();

const mongoose = require('mongoose');

console.log('MONGODB_URI:', process.env.MONGODB_URI); // Para verificar se a variável está sendo carregada

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Conectado ao MongoDB!');
    })
    .catch(err => {
        console.error('Erro ao conectar ao MongoDB:', err);
    });

// O restante do seu código...
