// Middleware para verificar permissões do usuário baseado no grupo
const Group = require('../models/Group');

/**
 * Middleware para verificar se o usuário possui uma permissão específica
 * @param {string} permission - Nome da permissão a ser verificada (ex: 'canCreateUser')
 * @returns {Function} Middleware Express
 */
function checkPermission(permission) {
    return async (req, res, next) => {
        try {
            // Verifica se o usuário está autenticado
            if (!req.user || !req.user.groupId) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }

            // Busca o grupo do usuário
            const group = await Group.findByPk(req.user.groupId);
            
            if (!group) {
                return res.status(403).json({ message: 'Grupo do usuário não encontrado.' });
            }

            // Verifica se o grupo possui a permissão
            if (!group[permission]) {
                return res.status(403).json({ 
                    message: 'Você não tem permissão para realizar esta ação.',
                    requiredPermission: permission
                });
            }

            // Anexa o grupo ao request para uso posterior
            req.userGroup = group;
            next();
        } catch (error) {
            console.error('Erro ao verificar permissão:', error);
            return res.status(500).json({ message: 'Erro ao verificar permissões.' });
        }
    };
}

/**
 * Middleware para verificar múltiplas permissões (requer todas)
 * @param {Array<string>} permissions - Array de permissões necessárias
 * @returns {Function} Middleware Express
 */
function checkPermissions(permissions) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.groupId) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }

            const group = await Group.findByPk(req.user.groupId);
            
            if (!group) {
                return res.status(403).json({ message: 'Grupo do usuário não encontrado.' });
            }

            // Verifica se o grupo possui todas as permissões
            const missingPermissions = permissions.filter(permission => !group[permission]);
            
            if (missingPermissions.length > 0) {
                return res.status(403).json({ 
                    message: 'Você não tem permissão para realizar esta ação.',
                    missingPermissions
                });
            }

            req.userGroup = group;
            next();
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            return res.status(500).json({ message: 'Erro ao verificar permissões.' });
        }
    };
}

/**
 * Middleware para verificar se o usuário possui ao menos uma das permissões
 * @param {Array<string>} permissions - Array de permissões (requer ao menos uma)
 * @returns {Function} Middleware Express
 */
function checkAnyPermission(permissions) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.groupId) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }

            const group = await Group.findByPk(req.user.groupId);
            
            if (!group) {
                return res.status(403).json({ message: 'Grupo do usuário não encontrado.' });
            }

            // Verifica se o grupo possui ao menos uma das permissões
            const hasPermission = permissions.some(permission => group[permission]);
            
            if (!hasPermission) {
                return res.status(403).json({ 
                    message: 'Você não tem permissão para realizar esta ação.',
                    requiredPermissions: permissions
                });
            }

            req.userGroup = group;
            next();
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            return res.status(500).json({ message: 'Erro ao verificar permissões.' });
        }
    };
}

module.exports = {
    checkPermission,
    checkPermissions,
    checkAnyPermission
};
