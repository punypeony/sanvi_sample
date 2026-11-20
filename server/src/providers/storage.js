import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

// JPEG, PNG, or WebP, checked from the file bytes. 2 MB is enforced by multer.
export function imageKind(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
  ) return 'png';
  if (
    buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';
  return '';
}

export async function saveImage(buffer) {
  const kind = imageKind(buffer);
  if (!kind) return null;
  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `${randomBytes(16).toString('hex')}.${kind}`;
  await fs.writeFile(path.join(uploadsDir, filename), buffer);
  return { filename, src: `/api/uploads/${filename}` };
}

export async function removeImage(src) {
  if (!src?.startsWith('/api/uploads/')) return;
  const filename = path.basename(src);
  if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(filename)) return;
  await fs.unlink(path.join(uploadsDir, filename)).catch(() => {});
}

export { uploadsDir };
