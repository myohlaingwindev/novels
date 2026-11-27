import { scrypt } from "@noble/hashes/scrypt.js";

const ITERATIONS = 100_000;
const encoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(password, salt);
  return `pbkdf2:${bytesToBase64(salt)}:${bytesToBase64(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("pbkdf2:")) return verifyPbkdf2(password, stored);
  return verifyScrypt(password, stored);
}

async function verifyPbkdf2(password: string, stored: string): Promise<boolean> {
  const [, saltText, hashText] = stored.split(":");
  if (!saltText || !hashText) return false;
  const salt = base64ToBytes(saltText);
  const expected = base64ToBytes(hashText);
  const actual = await deriveBits(password, salt);
  return sameBytes(actual, expected);
}

function verifyScrypt(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || salt.length !== 32 || hash.length !== 128) return false;
  const actual = scrypt(password, salt, {
    N: 16384,
    r: 8,
    p: 1,
    dkLen: 64,
    maxmem: 32 * 1024 * 1024,
  });
  return sameBytes(actual, hexToBytes(hash));
}

async function deriveBits(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: copyBytes(salt), iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function sameBytes(actual: Uint8Array, expected: Uint8Array): boolean {
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
