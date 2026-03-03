// ═══════════════════════════════════════════════
// AES-256-GCM Encryption Utility
// PAT / Token gibi hassas alanları DB'de şifreli saklar.
// ═══════════════════════════════════════════════
// Kullanım:
//   import { encrypt, decrypt, mask } from '@/lib/encryption';
//
//   const encrypted = encrypt('ghp_xxxx...');  // → 'iv:tag:ciphertext' (hex)
//   const plain     = decrypt(encrypted);      // → 'ghp_xxxx...'
//   const masked    = mask('ghp_xxxx1234');     // → '••••••1234'

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const TAG_LENGTH = 16;
const SEPARATOR = ':';

/**
 * Returns the 32-byte encryption key derived from ENCRYPTION_KEY env var.
 * Falls back to a deterministic hash of JWT_SECRET if ENCRYPTION_KEY is not set.
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY veya JWT_SECRET ortam değişkeni tanımlı değil. ' +
        'Hassas alan şifrelemesi için en az birinin set edilmesi gerekir.',
    );
  }
  // SHA-256 ile sabit 32 byte'a normalleştir
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns `iv:authTag:ciphertext` in hex encoding.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(SEPARATOR);
}

/**
 * Decrypts an `iv:authTag:ciphertext` string produced by encrypt().
 * Returns the original plaintext.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(SEPARATOR)) return ciphertext;

  const parts = ciphertext.split(SEPARATOR);
  if (parts.length !== 3) return ciphertext; // not encrypted — return as-is

  const [ivHex, tagHex, dataHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/**
 * Masks a sensitive value for API responses.
 * Shows last N characters, rest replaced with bullets.
 *   mask('ghp_abcdef1234', 4) → '••••••1234'
 *   mask('') → ''
 *   mask(null) → ''
 */
export function mask(value: string | null | undefined, visibleChars = 4): string {
  if (!value) return '';
  if (value.includes(SEPARATOR) && value.split(SEPARATOR).length === 3) {
    // Already encrypted — don't leak cipher text
    return '••••••••';
  }
  if (value.length <= visibleChars) return '•'.repeat(value.length);
  return '•'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
}

/**
 * Checks if a value looks like it's already encrypted (iv:tag:cipher format).
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(SEPARATOR);
  return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p));
}

/**
 * Encrypts only if value is not already encrypted and is non-empty.
 */
export function encryptIfNeeded(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isEncrypted(value)) return value;
  return encrypt(value);
}
