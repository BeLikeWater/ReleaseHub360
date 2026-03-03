/**
 * packages/backend/src/utils/crypto.ts
 * Re-exports AES-256-GCM encrypt/decrypt/mask from lib/encryption.
 * AC: crypto.ts path'ini karşılamak için; asıl implementasyon lib/encryption.ts'de.
 */
export { encrypt, decrypt, mask } from '../lib/encryption';
