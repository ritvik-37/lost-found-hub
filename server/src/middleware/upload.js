import mongoose from 'mongoose';
import multer from 'multer';
import { Upload } from '../models/Upload.js';
import { ApiError } from '../utils/ApiError.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_ERROR = 'Use a JPG, PNG or WebP image under 5 MB.';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Held in memory only until the controller stores it in MongoDB (after validation passes).
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 20, fieldSize: 16 * 1024 },
  fileFilter: (_req, file, cb) =>
    IMAGE_TYPES.includes(file.mimetype) ? cb(null, true) : cb(ApiError.badRequest(IMAGE_ERROR, { image: IMAGE_ERROR })),
}).single('image');

/** Check the file's magic bytes, since the browser-supplied mimetype can be spoofed. */
function hasImageSignature(buf, mimetype) {
  if (!buf || buf.length < 12) return false;
  if (mimetype === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mimetype === 'image/png') return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === 'image/webp') return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

function verifyImage(req, _res, next) {
  if (req.file && !hasImageSignature(req.file.buffer, req.file.mimetype)) {
    const msg = "That file isn't a valid JPG, PNG or WebP image.";
    return next(ApiError.badRequest(msg, { image: msg }));
  }
  next();
}

/** Parses an optional single "image" field (multipart) and validates it. JSON bodies pass through. */
export const uploadImage = [parser, verifyImage];

/** Store a validated multer file; returns its public URL ("/uploads/<id>"). */
export async function saveUpload(file, userId) {
  const doc = await Upload.create({ data: file.buffer, contentType: file.mimetype, size: file.size, uploadedBy: userId });
  return `/uploads/${doc._id}`;
}

const uploadId = (publicUrl) => publicUrl?.match(/^\/uploads\/([a-f\d]{24})$/i)?.[1];

/** Delete a stored photo by its public URL. Best effort. */
export function removeUpload(publicUrl) {
  const id = uploadId(publicUrl);
  if (id) Upload.deleteOne({ _id: id }).catch(() => {});
}

/** GET /uploads/:id */
export async function serveUpload(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Image not found.');
  const doc = await Upload.findById(id);
  if (!doc) throw ApiError.notFound('Image not found.');
  res.set({
    'Content-Type': doc.contentType,
    // Each id is immutable: a replaced photo gets a new id.
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  res.send(doc.data);
}
