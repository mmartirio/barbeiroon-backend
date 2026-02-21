const NodeCache = require('node-cache');
// Desabilita clonagem interna para evitar falhas com objetos complexos (Sequelize)
const cache = new NodeCache({ stdTTL: 60, useClones: false }); // 60 segundos padrão

function cacheMiddleware(keyBuilder) {
    return (req, res, next) => {
        const key = keyBuilder(req);
        const cached = cache.get(key);
        if (cached) {
            return res.status(200).json(cached);
        }
        res.sendResponse = res.json;
        res.json = (body) => {
            try {
                // Tenta serializar para guardar uma cópia simples
                const plain = JSON.parse(JSON.stringify(body));
                cache.set(key, plain);
            } catch (e) {
                // Se não conseguir serializar (circular), armazena o corpo cru sem clonagem
                cache.set(key, body);
            }
            res.sendResponse(body);
        };
        next();
    };
}

module.exports = cacheMiddleware;
