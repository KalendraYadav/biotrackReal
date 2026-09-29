import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const EVIDENCE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'evidence';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient = null;

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase Storage configuration missing: SUPABASE_URL and SUPABASE_SECRET_KEY required');
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return supabaseClient;
}

/**
 * Detects image format from actual magic/file bytes
 * Supported: JPEG (jpg), PNG (png), WebP (webp)
 * Rejects: SVG, HTML, Executables, arbitrary binary files
 */
export function detectImageFormat(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // Check for text/XML/SVG/HTML signatures immediately
  const headerAscii = buffer.subarray(0, 32).toString('ascii').toLowerCase();
  if (
    headerAscii.includes('<svg') ||
    headerAscii.includes('<?xml') ||
    headerAscii.includes('<!doctype') ||
    headerAscii.includes('<html')
  ) {
    return null;
  }

  // Reject executable PE / ELF headers
  if (buffer[0] === 0x4D && buffer[1] === 0x5A) return null; // Windows MZ
  if (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) return null; // Linux ELF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return null; // PDF

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // 3. WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50  // WEBP
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

/**
 * Validates declared MIME type and actual magic bytes against constraints
 */
export function validateImage(buffer, declaredMime) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('Empty image payload or buffer');
    err.statusCode = 400;
    return { valid: false, error: err.message, statusCode: 400 };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const err = new Error(`Image size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 5 MB`);
    err.statusCode = 413;
    return { valid: false, error: err.message, statusCode: 413 };
  }

  const detected = detectImageFormat(buffer);
  if (!detected) {
    const err = new Error('Invalid or unsupported image file format. Allowed formats are JPEG, PNG, and WebP.');
    err.statusCode = 400;
    return { valid: false, error: err.message, statusCode: 400 };
  }

  if (declaredMime) {
    const normDeclared = declaredMime.toLowerCase().trim();
    const normDetected = detected.mime.toLowerCase();
    const isMatch = (normDeclared === normDetected) ||
      (normDeclared === 'image/jpg' && normDetected === 'image/jpeg');

    if (!isMatch) {
      const err = new Error(`Declared MIME type (${declaredMime}) does not match actual image content (${detected.mime})`);
      err.statusCode = 400;
      return { valid: false, error: err.message, statusCode: 400 };
    }
  }

  return { valid: true, format: detected };
}

/**
 * Parses and decodes a data URL (e.g. data:image/jpeg;base64,...)
 */
export function parseBase64DataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;

  const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-\+\.]+);base64,(.+)$/s);
  if (!match) return null;

  const mimeType = match[1].toLowerCase().trim();
  const rawBase64 = match[2].trim();

  // Validate base64 structure (must be valid base64 characters)
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(rawBase64.replace(/\s+/g, ''))) {
    return { error: 'Malformed Base64 character sequence' };
  }

  try {
    const buffer = Buffer.from(rawBase64, 'base64');
    if (!buffer || buffer.length === 0) {
      return { error: 'Decoded Base64 buffer is empty' };
    }
    return { mimeType, buffer };
  } catch (err) {
    return { error: `Base64 decoding failed: ${err.message}` };
  }
}

/**
 * Generates deterministic, tamper-resistant object path:
 * batches/{batch_id}/{stage}_{timestamp}_{random}.{ext}
 */
export function generateObjectPath(batchId, stage, extension = 'jpg') {
  const cleanBatch = String(batchId || 'batch').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanStage = String(stage || 'evidence').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]; // YYYYMMDDTHHmmss
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const cleanExt = extension.replace(/^\./, '').toLowerCase();

  return `batches/${cleanBatch}/${cleanStage}_${timestamp}_${randomSuffix}.${cleanExt}`;
}

/**
 * Uploads an image buffer directly to Supabase Storage private bucket
 */
export async function uploadEvidenceBuffer({ buffer, batchId, stage, mimeType, extension }) {
  const client = getSupabaseClient();
  const objectPath = generateObjectPath(batchId, stage, extension);

  const { data, error } = await client.storage
    .from(EVIDENCE_BUCKET)
    .upload(objectPath, buffer, {
      contentType: mimeType,
      upsert: false // Evidence must never overwrite existing objects
    });

  if (error) {
    console.error(`[StorageService] Upload to "${EVIDENCE_BUCKET}" failed:`, error.message);
    const err = new Error(`Supabase Storage upload failed: ${error.message}`);
    err.statusCode = 502;
    throw err;
  }

  return {
    objectPath: data.path || objectPath,
    bucket: EVIDENCE_BUCKET
  };
}

/**
 * Processes incoming evidence photo payload:
 * - Base64 Data URL -> decodes, validates, uploads to Supabase, returns stable object path
 * - Legacy relative path (/uploads/...) -> preserves as is
 * - HTTP/HTTPS URL -> preserves as is
 * - Stable Supabase path (batches/...) -> preserves as is
 */
export async function processEvidencePhoto(photoUrl, { batchId, stage } = {}) {
  if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') {
    return null;
  }

  const trimmed = photoUrl.trim();

  // 1. Handle Base64 Data URL
  if (trimmed.startsWith('data:')) {
    if (!trimmed.startsWith('data:image/')) {
      const err = new Error('Invalid evidence data URL: only image/* data URLs are supported');
      err.statusCode = 400;
      throw err;
    }

    const parsed = parseBase64DataUrl(trimmed);
    if (!parsed || parsed.error) {
      const err = new Error(`Malformed Base64 evidence image: ${parsed?.error || 'Invalid format'}`);
      err.statusCode = 400;
      throw err;
    }

    const { mimeType, buffer } = parsed;

    // Validate size and magic bytes
    const validation = validateImage(buffer, mimeType);
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.statusCode = validation.statusCode || 400;
      throw err;
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadEvidenceBuffer({
      buffer,
      batchId: batchId || 'unassigned',
      stage: stage || 'general',
      mimeType: validation.format.mime,
      extension: validation.format.ext
    });

    return uploadResult.objectPath;
  }

  // 2. Preserve legacy seed paths (/uploads/evidence/...)
  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }

  // 3. Preserve external HTTP / HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 4. Preserve existing stable Supabase object paths
  if (trimmed.startsWith('batches/')) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Generates a short-lived signed URL for an object stored in the private bucket
 */
export async function getSignedEvidenceUrl(objectPath, expiresIn = 1800) {
  if (!objectPath || typeof objectPath !== 'string') return null;

  // If already an absolute HTTP/HTTPS URL or legacy path, return as is
  if (objectPath.startsWith('http://') || objectPath.startsWith('https://') || objectPath.startsWith('/uploads/')) {
    return objectPath;
  }

  try {
    const client = getSupabaseClient();
    const cleanPath = objectPath.replace(/^evidence\//, ''); // Clean leading bucket name if present

    const { data, error } = await client.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrl(cleanPath, expiresIn);

    if (error) {
      console.warn(`[StorageService] Failed to sign URL for "${cleanPath}":`, error.message);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.warn(`[StorageService] Error generating signed URL for "${objectPath}":`, err.message);
    return null;
  }
}

/**
 * Attaches short-lived signed URLs to custody events within a batch object
 */
export async function attachSignedUrlsToBatch(batch) {
  if (!batch || !Array.isArray(batch.custody_events)) {
    return batch;
  }

  const enrichedEvents = await Promise.all(
    batch.custody_events.map(async (event) => {
      if (event.photo_url && event.photo_url.startsWith('batches/')) {
        const signedUrl = await getSignedEvidenceUrl(event.photo_url);
        return {
          ...event,
          signed_photo_url: signedUrl
        };
      }
      return {
        ...event,
        signed_photo_url: event.photo_url // Legacy or external URL
      };
    })
  );

  return {
    ...batch,
    custody_events: enrichedEvents
  };
}

export default {
  detectImageFormat,
  validateImage,
  parseBase64DataUrl,
  generateObjectPath,
  uploadEvidenceBuffer,
  processEvidencePhoto,
  getSignedEvidenceUrl,
  attachSignedUrlsToBatch,
  EVIDENCE_BUCKET,
  MAX_FILE_SIZE_BYTES
};
