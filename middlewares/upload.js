const multer = require('multer');
const path = require('path');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const ALLOWED_MIMETYPES  = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function sanitizeFilename(name) {
    // Remove path traversal, null bytes e mantém apenas chars seguros
    return path.basename(name)
        .replace(/\0/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 100);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        const safe = sanitizeFilename(file.originalname);
        const ext  = path.extname(safe).toLowerCase();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${ext}`);
    },
});

function fileFilter(req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIMETYPES.has(mime)) {
        cb(null, true);
    } else {
        const err = new Error(`Tipo de arquivo não permitido: ${mime} (${ext})`);
        err.code = 'INVALID_FILE_TYPE';
        cb(err, false);
    }
}

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB — imagens de logo não precisam de 20 MB
    fileFilter,
});

module.exports = upload;
