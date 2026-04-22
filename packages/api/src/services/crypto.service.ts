import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from "node:crypto";
import { requiredEnv } from "../utils/requiredEnv";

const ALGORITHM = "aes-256-gcm";
const NONCE_LENGTH = 12; // 96-bit nonce - AES-GCM standard
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag - AES-GCM standard
const KEY_LENGTH = 32; // 256-bit key

let key: Buffer | null = null;
 
export function initCrypto(): void {
    const seed = requiredEnv("MESSAGE_ENCRYPTION_SEED");
 
    const derived = createHash("sha256").update(seed, "utf8").digest();
    if (derived.length !== KEY_LENGTH) {
        throw new Error(`Derived key has wrong length: ${derived.length}`);
    }
 
    key = derived;
    console.log("Message encryption key loaded");
}
 
function getKey(): Buffer {
    if (!key) {
        throw new Error("Crypto not initialised");
    }
    return key;
}
 
// Encrypts plaintext with AES-256-GCM
// Returns the ciphertext (with the 16-byte auth tag appended) and the random nonce
// A fresh nonce is generated on every call - never reused with the same key
export function encrypt(plaintext: string): { cipher: Uint8Array<ArrayBuffer>; nonce: Uint8Array<ArrayBuffer> } {
    const k = getKey();
    const nonce = randomBytes(NONCE_LENGTH);
 
    const cipher = createCipheriv(ALGORITHM, k, nonce);
    const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
 
    return {
        cipher: Buffer.concat([ciphertext, authTag]),
        nonce,
    };
}
 
// Decrypts ciphertext
// Throws if the auth tag fails to verify (i.e. the ciphertext was tampered with or the wrong key is being used)
export function decrypt(cipherWithTag: Uint8Array, nonce: Uint8Array): string {
    const k = getKey();
 
    if (cipherWithTag.length < AUTH_TAG_LENGTH) {
        throw new Error("Ciphertext too short to contain auth tag");
    }
 
    const tagOffset = cipherWithTag.length - AUTH_TAG_LENGTH;
    const ciphertext = cipherWithTag.subarray(0, tagOffset);
    const authTag = cipherWithTag.subarray(tagOffset);
 
    const decipher = createDecipheriv(ALGORITHM, k, nonce);
    decipher.setAuthTag(authTag);
 
    const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);
 
    return plaintext.toString("utf8");
}
