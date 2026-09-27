const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const { HttpError } = require('../http/errors');

const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 4, parts: 5, fieldSize: 16 * 1024 },
  fileFilter(req, file, callback) {
    if (!EXTENSIONS[file.mimetype.toLowerCase()]) {
      callback(new HttpError(400, 'Formato de imagem inválido. Use JPEG, PNG, WebP ou GIF.'));
      return;
    }
    callback(null, true);
  },
}).single('Image');

function hasSignature(buffer, type) {
  if (type === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (type === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6));
  if (type === 'image/webp') return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

async function saveImage(file, uploadsPath) {
  if (!file || !file.size) return null;
  const type = file.mimetype.toLowerCase();
  if (!hasSignature(file.buffer, type)) throw new HttpError(400, 'O conteúdo da imagem não corresponde ao formato informado.');

  const filename = `${randomUUID().replaceAll('-', '')}${EXTENSIONS[type]}`;
  await fs.mkdir(uploadsPath, { recursive: true });
  await fs.writeFile(path.join(uploadsPath, filename), file.buffer, { flag: 'wx' });
  return `/uploads/${filename}`;
}

async function removeImage(imagePath, uploadsPath) {
  if (!imagePath) return;
  await fs.unlink(path.join(uploadsPath, path.basename(imagePath))).catch(() => {});
}

module.exports = { upload, saveImage, removeImage, MAX_BYTES };
