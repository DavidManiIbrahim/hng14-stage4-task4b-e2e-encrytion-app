// Crypto utilities for E2EE messaging using Web Crypto API

const ALGORITHM = {
  name: "RSA-OAEP",
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

const SYMMETRIC_ALGORITHM = {
  name: "AES-GCM",
  length: 256,
};

/**
 * Generate RSA key pair for a user
 */
export async function generateKeyPair(): Promise<{
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
  publicKeyPem: string;
}> {
  const keyPair = await window.crypto.subtle.generateKey(
    ALGORITHM,
    true, // extractable
    ["encrypt", "decrypt"]
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.publicKey
  );
  const privateKeyJwk = await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey
  );

  // Store private key in IndexedDB (never send to server)
  await storePrivateKey(privateKeyJwk);

  return {
    publicKey: publicKeyJwk,
    privateKey: privateKeyJwk,
    publicKeyPem: JSON.stringify(publicKeyJwk),
  };
}

/**
 * Store private key securely in IndexedDB
 */
export async function storePrivateKey(
  privateKeyJwk: JsonWebKey,
  userId?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("e2e_messaging_db", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const store = db
        .transaction("keys", "readwrite")
        .objectStore("keys");

      store.put({
        id: userId || "current_user",
        privateKey: privateKeyJwk,
        timestamp: Date.now(),
      });

      resolve();
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("keys")) {
        db.createObjectStore("keys", { keyPath: "id" });
      }
    };
  });
}

/**
 * Retrieve private key from IndexedDB
 */
export async function getPrivateKey(
  userId?: string
): Promise<JsonWebKey | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("e2e_messaging_db", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const store = db
        .transaction("keys", "readonly")
        .objectStore("keys");

      const getRequest = store.get(userId || "current_user");
      getRequest.onsuccess = () => {
        resolve(getRequest.result?.privateKey || null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("keys")) {
        db.createObjectStore("keys", { keyPath: "id" });
      }
    };
  });
}

/**
 * Encrypt symmetric key with recipient's public key
 */
export async function encryptWithPublicKey(
  data: ArrayBuffer,
  publicKeyJwk: JsonWebKey
): Promise<ArrayBuffer> {
  const publicKey = await window.crypto.subtle.importKey(
    "jwk",
    publicKeyJwk,
    ALGORITHM,
    false,
    ["encrypt"]
  );

  return window.crypto.subtle.encrypt("RSA-OAEP", publicKey, data);
}

/**
 * Decrypt data with user's private key
 */
export async function decryptWithPrivateKey(
  encryptedData: ArrayBuffer,
  privateKeyJwk: JsonWebKey
): Promise<ArrayBuffer> {
  const privateKey = await window.crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    ALGORITHM,
    false,
    ["decrypt"]
  );

  return window.crypto.subtle.decrypt("RSA-OAEP", privateKey, encryptedData);
}

/**
 * Encrypt message with AES-GCM
 */
export async function encryptMessage(
  message: string,
  symmetricKey: CryptoKey
): Promise<{
  ciphertext: string;
  iv: string;
  tag?: string;
}> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const encrypted = await window.crypto.subtle.encrypt(
    { ...SYMMETRIC_ALGORITHM, iv },
    symmetricKey,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypt message with AES-GCM
 */
export async function decryptMessage(
  ciphertext: string,
  iv: string,
  symmetricKey: CryptoKey
): Promise<string> {
  const encryptedData = base64ToArrayBuffer(ciphertext);
  const ivArray = base64ToArrayBuffer(iv);

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { ...SYMMETRIC_ALGORITHM, iv: ivArray },
      symmetricKey,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error("Failed to decrypt message. Possible tampering detected.");
  }
}

/**
 * Generate a symmetric key for message encryption
 */
export async function generateSymmetricKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    SYMMETRIC_ALGORITHM,
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Export symmetric key to raw format
 */
export async function exportSymmetricKey(key: CryptoKey): Promise<ArrayBuffer> {
  return window.crypto.subtle.exportKey("raw", key);
}

/**
 * Import symmetric key from raw format
 */
export async function importSymmetricKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "raw",
    keyData,
    SYMMETRIC_ALGORITHM,
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Helper: Convert ArrayBuffer to Base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Convert Base64 to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a hash of data for verification
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await window.crypto.subtle.digest(
    "SHA-256",
    encoder.encode(data)
  );
  return arrayBufferToBase64(hash);
}
