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

  // Strip alg field to prevent conflicts with importKey algorithm parameter
  delete publicKeyJwk.alg;
  delete privateKeyJwk.alg;

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
  const { alg, ...jwkWithoutAlg } = publicKeyJwk;
  const publicKey = await window.crypto.subtle.importKey(
    "jwk",
    jwkWithoutAlg,
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
  const { alg, ...jwkWithoutAlg } = privateKeyJwk;
  const privateKey = await window.crypto.subtle.importKey(
    "jwk",
    jwkWithoutAlg,
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

/**
 * Prepare an encrypted message payload for transmission
 *
 * Encryption Flow:
 * 1. Generate a fresh AES-256-GCM symmetric key for this message
 * 2. Encrypt the plaintext message using AES-GCM (produces ciphertext + IV)
 * 3. Export the raw symmetric key bytes
 * 4. Wrap the symmetric key with recipient's RSA public key → encryptedKey
 * 5. Wrap the symmetric key with sender's RSA public key → encryptedKeyForSelf
 * 6. Return complete payload with both encrypted keys (recipient and sender can both decrypt)
 *
 * @param plaintext - The message text to encrypt
 * @param recipientPublicKeyJwk - Recipient's RSA public key (JsonWebKey format)
 * @param senderPublicKeyJwk - Sender's RSA public key (JsonWebKey format)
 * @returns Payload object with ciphertext, iv, and RSA-wrapped keys for both parties
 */
export async function prepareMessagePayload(
  plaintext: string,
  recipientPublicKeyJwk: JsonWebKey,
  senderPublicKeyJwk: JsonWebKey
): Promise<{
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}> {
  // Generate a fresh symmetric key for this message
  const symmetricKey = await generateSymmetricKey();

  // Encrypt the plaintext using AES-GCM
  const { ciphertext, iv } = await encryptMessage(plaintext, symmetricKey);

  // Export the symmetric key in raw format
  const rawKeyData = await exportSymmetricKey(symmetricKey);

  // RSA-OAEP wrap the key for the recipient
  const encryptedKeyBuffer = await encryptWithPublicKey(
    rawKeyData,
    recipientPublicKeyJwk
  );
  const encryptedKey = arrayBufferToBase64(encryptedKeyBuffer);

  // RSA-OAEP wrap the key for the sender (for message history decryption)
  const encryptedKeyForSelfBuffer = await encryptWithPublicKey(
    rawKeyData,
    senderPublicKeyJwk
  );
  const encryptedKeyForSelf = arrayBufferToBase64(encryptedKeyForSelfBuffer);

  return {
    ciphertext,
    iv,
    encryptedKey,
    encryptedKeyForSelf,
  };
}

/**
 * Decrypt an incoming encrypted message payload
 *
 * Decryption Flow:
 * 1. Select the correct RSA-wrapped key based on whether this is sender or recipient
 * 2. RSA-OAEP unwrap the symmetric key using the provided private key
 * 3. Import the unwrapped raw key as a CryptoKey
 * 4. AES-GCM decrypt the ciphertext using the symmetric key and IV
 * 5. Return the plaintext message
 *
 * @param payload - The encrypted message payload from the API
 * @param privateKeyJwk - The user's RSA private key (JsonWebKey format)
 * @param isSender - If true, decrypt using encryptedKeyForSelf; if false, use encryptedKey
 * @returns The decrypted plaintext message
 * @throws Error if decryption fails (possible tampering or key mismatch)
 */
export async function decryptMessagePayload(
  payload: {
    ciphertext: string;
    iv: string;
    encryptedKey: string;
    encryptedKeyForSelf: string;
  },
  privateKeyJwk: JsonWebKey,
  isSender: boolean
): Promise<string> {
  try {
    // Select the appropriate encrypted key based on user's role
    const encryptedKeyB64 = isSender ? payload.encryptedKeyForSelf : payload.encryptedKey;
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyB64);

    // RSA-OAEP unwrap the symmetric key
    const rawKeyData = await decryptWithPrivateKey(
      encryptedKeyBuffer,
      privateKeyJwk
    );

    // Import the unwrapped key back into a CryptoKey
    const symmetricKey = await importSymmetricKey(rawKeyData);

    // AES-GCM decrypt the message
    const plaintext = await decryptMessage(
      payload.ciphertext,
      payload.iv,
      symmetricKey
    );

    return plaintext;
  } catch (error) {
    throw new Error(
      `Failed to decrypt message payload: ${error instanceof Error ? error.message : "Unknown error"}. ` +
      "This may indicate the message was tampered with or you lack the decryption key."
    );
  }
}

/**
 * Fetch and decrypt all messages from all conversations
 *
 * Process Flow:
 * 1. Retrieve private key from IndexedDB if not provided
 * 2. Fetch all conversations from GET /conversations
 * 3. For each conversation, fetch message history from GET /conversations/{id}/messages
 * 4. For each message, determine if current user is the sender
 * 5. Decrypt each message using decryptMessagePayload()
 * 6. If decryption fails, mark the message with decryptionFailed: true and continue
 * 7. Return all messages sorted by created_at ascending (oldest first)
 *
 * @param currentUserId - The UUID of the current user
 * @param privateKeyJwk - Optional: the user's RSA private key (will fetch from IndexedDB if not provided)
 * @returns Array of decrypted message objects with plaintext and decryption status
 * @throws Error if unable to retrieve private key or fetch conversations
 */
export async function receiveMessages(
  currentUserId: string,
  privateKeyJwk?: JsonWebKey
): Promise<
  Array<{
    id: string;
    sender_id: string;
    created_at: string;
    plaintext: string;
    decryptionFailed: boolean;
  }>
> {
  // Retrieve private key from IndexedDB if not provided
  let key = privateKeyJwk;
  if (!key) {
    key = await getPrivateKey(currentUserId);
    if (!key) {
      throw new Error(
        `Unable to retrieve private key for user ${currentUserId}. Key may not be stored in IndexedDB.`
      );
    }
  }

  // Fetch all conversations
  const conversationsResponse = await fetch("/api/conversations");
  if (!conversationsResponse.ok) {
    throw new Error(
      `Failed to fetch conversations: ${conversationsResponse.status} ${conversationsResponse.statusText}`
    );
  }
  const conversations: Array<{ id: string }> = await conversationsResponse.json();

  const allMessages: Array<{
    id: string;
    sender_id: string;
    created_at: string;
    plaintext: string;
    decryptionFailed: boolean;
  }> = [];

  // Fetch and decrypt messages from each conversation
  for (const conversation of conversations) {
    try {
      const messagesResponse = await fetch(
        `/api/conversations/${conversation.id}/messages`
      );

      if (!messagesResponse.ok) {
        console.warn(
          `Failed to fetch messages for conversation ${conversation.id}: ${messagesResponse.status}`
        );
        continue;
      }

      const messages: Array<{
        id: string;
        sender_id: string;
        created_at: string;
        payload: {
          ciphertext: string;
          iv: string;
          encryptedKey: string;
          encryptedKeyForSelf: string;
        };
      }> = await messagesResponse.json();

      // Decrypt each message
      for (const message of messages) {
        const isSender = message.sender_id === currentUserId;

        try {
          const plaintext = await decryptMessagePayload(
            message.payload,
            key,
            isSender
          );

          allMessages.push({
            id: message.id,
            sender_id: message.sender_id,
            created_at: message.created_at,
            plaintext,
            decryptionFailed: false,
          });
        } catch (decryptError) {
          // Log the error but continue processing other messages
          console.error(
            `Failed to decrypt message ${message.id} from conversation ${conversation.id}:`,
            decryptError
          );

          allMessages.push({
            id: message.id,
            sender_id: message.sender_id,
            created_at: message.created_at,
            plaintext: "",
            decryptionFailed: true,
          });
        }
      }
    } catch (conversationError) {
      console.error(
        `Error processing conversation ${conversation.id}:`,
        conversationError
      );
      // Continue to next conversation instead of crashing
      continue;
    }
  }

  // Sort messages by created_at ascending (oldest first)
  allMessages.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return allMessages;
}
