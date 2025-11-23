const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 }); // 60 segundos padrão

function cacheMiddleware(keyBuilder) {
    return (req, res, next) => {
        const key = keyBuilder(req);
        const cached = cache.get(key);
        if (cached) {
            return res.status(200).json(cached);
        }
        res.sendResponse = res.json;
        res.json = (body) => {
            cache.set(key, body);
            res.sendResponse(body);
        };
        next();
    };
}

module.exports = cacheMiddleware;
