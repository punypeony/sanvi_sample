import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

// OWASP's Argon2id starting point: 19 MiB, 2 iterations, 1 lane.
const options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function generatePassword() {
  return randomBytes(18).toString('base64url');
}

export function hashPassword(password) {
  return argon2.hash(password, options);
}

export function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}
