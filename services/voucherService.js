const Voucher = require('../models/Voucher');
const { Op } = require('sequelize');
const crypto = require('crypto');

class VoucherService {
    static async generateVoucher({ customerPhone, tenantId, promotionId, expiresAt = null }) {
        const code = crypto.randomBytes(8).toString('hex');
        const voucher = await Voucher.create({
            code,
            customerPhone,
            tenantId,
            promotionId,
            expiresAt,
        });
        return voucher;
    }

    static async getValidVoucher({ customerPhone, tenantId, promotionId }) {
        return Voucher.findOne({
            where: {
                customerPhone,
                tenantId,
                promotionId,
                used: false,
                [Op.or]: [
                    { expiresAt: null },
                    { expiresAt: { [Op.gte]: new Date() } }
                ]
            }
        });
    }

    static async markAsUsed(code) {
        return Voucher.update({ used: true }, { where: { code } });
    }
}

module.exports = VoucherService;
