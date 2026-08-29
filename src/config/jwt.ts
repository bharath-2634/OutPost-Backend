import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from './env';

const KEYS_DIR = path.join(process.cwd(), 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');

/**
 * Loads RSA 2048 key pair for RS256 JWT signing and verification.
 * Priority:
 * 1. Environment variables: JWT_PRIVATE_KEY & JWT_PUBLIC_KEY
 * 2. File paths: keys/private.pem & keys/public.pem
 * 3. Fallback for Local Dev: Auto-generate static key pair files if missing.
 *    (In production, explicitly supply environment variables or mounted key files).
 */
function loadOrGenerateRsaKeys(): { privateKey: string; publicKey: string } {
  // Option 1: Env variables
  if (env.JWT_PRIVATE_KEY && env.JWT_PUBLIC_KEY) {
    return {
      privateKey: env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      publicKey: env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
    };
  }

  // Option 2: Key files exist
  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    return {
      privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
      publicKey: fs.readFileSync(PUBLIC_KEY_PATH, 'utf8'),
    };
  }

  // Option 3: Generate key pair for dev environment
  console.log('🔑 RSA Keys missing. Generating 2048-bit RSA Key Pair in ./keys for RS256 JWT...');
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

  return { privateKey, publicKey };
}

const keys = loadOrGenerateRsaKeys();

export const JWT_CONFIG = {
  privateKey: keys.privateKey,
  publicKey: keys.publicKey,
  algorithm: 'RS256' as const,
  accessTokenExpiresIn: '30m', // Access token valid for 30 minutes
  refreshTokenExpiresInDays: 30, // Refresh token valid for 30 days
};
