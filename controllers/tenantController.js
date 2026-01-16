// Upload de imagem de fundo (arquivo) para o tenant
exports.uploadBackgroundImage = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado' });
        }
        const tenant = await require('../models/Tenant').findByPk(id);
        if (!tenant) {
            return res.status(404).json({ message: 'Barbearia não encontrada' });
        }
        // Salva a imagem no banco (tabela Image)
        const Image = require('../models/Image');
        const image = await Image.create({
            data: req.file.buffer || require('fs').readFileSync(req.file.path),
            contentType: req.file.mimetype
        });
        // Remove arquivo físico se existir
        if (req.file.path) {
            require('fs').unlink(req.file.path, () => {});
        }
        tenant.backgroundImage = image.id;
        await tenant.save();
        res.status(200).json({ message: 'Imagem de fundo atualizada com sucesso', backgroundImage: image.id });
    } catch (error) {
        console.error('Erro ao fazer upload da imagem de fundo:', error);
        res.status(500).json({ message: 'Erro ao fazer upload da imagem de fundo' });
    }
};
// Atualiza logo e backgroundImage do tenant
exports.updateImages = async (req, res) => {
    try {
        const { id } = req.params;
        const { logo, backgroundImage } = req.body;
        const tenant = await require('../models/Tenant').findByPk(id);
        if (!tenant) {
            return res.status(404).json({ message: 'Barbearia não encontrada' });
        }
        if (logo !== undefined) tenant.logo = logo;
        if (backgroundImage !== undefined) tenant.backgroundImage = backgroundImage;
        await tenant.save();
        res.status(200).json({ message: 'Imagens atualizadas com sucesso', logo: tenant.logo, backgroundImage: tenant.backgroundImage });
    } catch (error) {
        console.error('Erro ao atualizar imagens do tenant:', error);
        res.status(500).json({ message: 'Erro ao atualizar imagens do tenant' });
    }
};
// Retorna dados básicos do tenant como "config"
exports.getConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = await require('../models/Tenant').findByPk(id);
        if (!tenant) {
            return res.status(404).json({ message: 'Barbearia não encontrada' });
        }
        // Aqui você pode customizar o que é retornado como "config" do tenant
        res.status(200).json({
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            email: tenant.email,
            logo: tenant.logo,
            backgroundImage: tenant.backgroundImage
        });
    } catch (error) {
        console.error('Erro ao buscar config do tenant:', error);
        res.status(500).json({ message: 'Erro ao buscar config do tenant' });
    }
};
const TenantService = require('../services/tenantService');
const TenantOnboardingService = require('../services/tenantOnboardingService');

/**
 * Endpoint público para registro completo de barbearia
 * Cria tenant + grupos + usuário admin em uma operação
 */
exports.register = async (req, res) => {
    try {
        const result = await TenantOnboardingService.onboardTenant(req.body);
        
        res.status(201).json({
            message: 'Barbearia cadastrada com sucesso!',
            ...result
        });
    } catch (error) {
        console.error('Erro ao registrar barbearia:', error);
        res.status(400).json({ 
            message: error.message || 'Não foi possível completar o cadastro da barbearia. Por favor, verifique os dados e tente novamente' 
        });
    }
};

/**
 * Buscar barbearia por slug (público)
 */
exports.getBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const tenant = await TenantOnboardingService.getTenantBySlug(slug);
        
        if (!tenant) {
            return res.status(404).json({ message: 'Barbearia não encontrada. Verifique se o link está correto' });
        }

        res.status(200).json(tenant);
    } catch (error) {
        console.error('Erro ao buscar barbearia:', error);
        res.status(500).json({ message: 'Não foi possível carregar os dados da barbearia. Tente novamente em alguns instantes' });
    }
};

/**
 * Atualizar dados da barbearia (requer autenticação e permissão)
 */
exports.updateTenant = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const userId = req.user.id;

        const tenant = await TenantOnboardingService.updateTenant(tenantId, req.body, userId);

        res.status(200).json({
            message: 'Dados da barbearia atualizados com sucesso',
            tenant
        });
    } catch (error) {
        console.error('Erro ao atualizar barbearia:', error);
        res.status(400).json({ 
            message: error.message || 'Não foi possível atualizar os dados da barbearia. Verifique as informações e tente novamente' 
        });
    }
};

/**
 * Buscar configurações da barbearia (requer autenticação)
 */
exports.getSettings = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const Tenant = require('../models/Tenant');
        
        const tenant = await Tenant.findByPk(tenantId, {
            attributes: ['id', 'name', 'slug', 'email', 'phone', 'logo', 'backgroundImage']
        });

        if (!tenant) {
            return res.status(404).json({ message: 'Não foi possível encontrar sua barbearia. Por favor, faça login novamente' });
        }

        res.status(200).json(tenant);
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ message: 'Não foi possível carregar as configurações. Tente novamente' });
    }
};

/**
 * Upload de logo e background da barbearia
 */
exports.uploadAssets = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const Tenant = require('../models/Tenant');
        
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Não foi possível encontrar sua barbearia' });
        }

        const updateData = {};

        // Se logo foi enviada
        if (req.files && req.files.logo && req.files.logo[0]) {
            const logoPath = `/uploads/${req.files.logo[0].filename}`;
            updateData.logo = logoPath;
        }

        // Se background foi enviado
        if (req.files && req.files.background && req.files.background[0]) {
            const backgroundPath = `/uploads/${req.files.background[0].filename}`;
            updateData.backgroundImage = backgroundPath;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'Por favor, selecione pelo menos um arquivo (logo ou plano de fundo) para enviar' });
        }

        await tenant.update(updateData);

        res.status(200).json({
            message: 'Arquivos enviados com sucesso!',
            logo: tenant.logo,
            backgroundImage: tenant.backgroundImage
        });
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        res.status(500).json({ message: 'Não foi possível fazer o upload dos arquivos. Verifique o tamanho e formato das imagens' });
    }
};

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await TenantService.getAll({ page, limit });
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao carregar barbearias:', error);
        res.status(500).json({ message: 'Erro ao carregar barbearias' });
    }
};

exports.create = async (req, res) => {
    try {
        const tenant = await TenantService.create(req.body);
        res.status(201).json(tenant);
    } catch (error) {
        console.error('Erro ao criar barbearia:', error);
        res.status(500).json({ message: 'Erro ao criar barbearia' });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await TenantService.delete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Barbearia não encontrada' });
        }
        res.status(200).json({ message: 'Barbearia removida com sucesso' });
    } catch (error) {
        console.error('Erro ao remover barbearia:', error);
        res.status(500).json({ message: 'Erro ao remover barbearia' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await TenantService.update(id, req.body);
        if (!updated) {
            return res.status(404).json({ message: 'Barbearia não encontrada' });
        }
        res.status(200).json(updated);
    } catch (error) {
        console.error('Erro ao editar barbearia:', error);
        res.status(500).json({ message: 'Erro ao editar barbearia' });
    }
};
