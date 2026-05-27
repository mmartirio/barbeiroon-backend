// Gera o payload estático PIX (BR Code / Pix Copia e Cola)
// Referência: Manual de Padrões para Iniciação do Pix - BACEN v3.3

function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
        }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function tlv(id, value) {
    return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

function sanitize(str, maxLen) {
    return (str || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .substring(0, maxLen);
}

/**
 * @param {object} opts
 * @param {string} opts.pixKey       - Chave PIX
 * @param {number} opts.amountCents  - Valor em centavos (0 = sem valor fixo)
 * @param {string} opts.merchantName - Nome do recebedor (max 25)
 * @param {string} opts.merchantCity - Cidade do recebedor (max 15)
 * @param {string} [opts.txid]       - Identificador da transação (max 25, alfanumérico)
 * @param {string} [opts.description] - Descrição (max 40)
 * @returns {string} Pix Copia e Cola (EMV)
 */
function generatePixEMV({ pixKey, amountCents = 0, merchantName, merchantCity, txid = '***', description = '' }) {
    const name  = sanitize(merchantName, 25) || 'RECEBEDOR';
    const city  = sanitize(merchantCity, 15) || 'BRASIL';
    const txidClean = (txid || '***').replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || '***';

    // 26: Merchant Account Information
    let mai = tlv('0014', 'BR.GOV.BCB.PIX');
    mai += tlv('01', pixKey);
    if (description) mai += tlv('02', description.substring(0, 40));

    // 62: Additional Data (txid)
    const additional = tlv('62', tlv('05', txidClean));

    // Amount (54) — só incluir se valor fixo
    const amountStr = amountCents > 0
        ? tlv('54', (amountCents / 100).toFixed(2))
        : '';

    const payload = [
        tlv('00', '01'),        // Payload Format Indicator
        tlv('26', mai),         // Merchant Account Info
        tlv('52', '0000'),      // MCC
        tlv('53', '986'),       // Currency BRL
        amountStr,
        tlv('58', 'BR'),        // Country Code
        tlv('59', name),        // Merchant Name
        tlv('60', city),        // Merchant City
        additional,
        '6304',                  // CRC placeholder (sem valor ainda)
    ].join('');

    return payload + crc16(payload);
}

module.exports = { generatePixEMV };
