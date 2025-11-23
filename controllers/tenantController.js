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
