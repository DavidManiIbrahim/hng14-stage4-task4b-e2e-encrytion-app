/**
 * Comprehensive unit and integration tests for E2EE encryption/decryption
 * Tests the entire end-to-end encryption flow using Web Crypto API
 */

import * as crypto from "./crypto";

// Helper to simulate sleep
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Crypto Utilities - Unit Tests", () => {
  describe("Key Generation", () => {
    test("generateKeyPair should create valid RSA key pair", async () => {
      const keyPair = await crypto.generateKeyPair();

      expect(keyPair).toHaveProperty("publicKey");
      expect(keyPair).toHaveProperty("privateKey");
      expect(keyPair).toHaveProperty("publicKeyPem");

      expect(keyPair.publicKey).toHaveProperty("kty", "RSA");
      expect(keyPair.publicKey).toHaveProperty("key_ops");
      expect(keyPair.publicKey).not.toHaveProperty("alg");

      expect(keyPair.privateKey).toHaveProperty("kty", "RSA");
      expect(keyPair.privateKey).not.toHaveProperty("alg");
    });

    test("generateKeyPair should strip alg field from JWK", async () => {
      const keyPair = await crypto.generateKeyPair();

      expect(keyPair.publicKey.alg).toBeUndefined();
      expect(keyPair.privateKey.alg).toBeUndefined();
    });

    test("generateSymmetricKey should create valid AES key", async () => {
      const key = await crypto.generateSymmetricKey();

      expect(key).toBeInstanceOf(CryptoKey);
      expect(key.type).toBe("secret");
      expect(key.algorithm).toHaveProperty("name", "AES-GCM");
      expect(key.algorithm).toHaveProperty("length", 256);
      expect(key.usages).toContain("encrypt");
      expect(key.usages).toContain("decrypt");
    });
  });

  describe("Symmetric Encryption (AES-GCM)", () => {
    let symmetricKey: CryptoKey;

    beforeEach(async () => {
      symmetricKey = await crypto.generateSymmetricKey();
    });

    test("encryptMessage should produce ciphertext and IV", async () => {
      const plaintext = "Hello, World!";
      const result = await crypto.encryptMessage(plaintext, symmetricKey);

      expect(result).toHaveProperty("ciphertext");
      expect(result).toHaveProperty("iv");
      expect(typeof result.ciphertext).toBe("string");
      expect(typeof result.iv).toBe("string");

      // Ciphertext should be base64 encoded and non-empty
      expect(result.ciphertext.length).toBeGreaterThan(0);
      expect(result.iv.length).toBeGreaterThan(0);
    });

    test("encryptMessage should produce different ciphertexts for same plaintext (random IV)", async () => {
      const plaintext = "Same message";

      const result1 = await crypto.encryptMessage(plaintext, symmetricKey);
      const result2 = await crypto.encryptMessage(plaintext, symmetricKey);

      // IVs should be different due to random generation
      expect(result1.iv).not.toBe(result2.iv);
      // Ciphertexts should be different due to different IVs
      expect(result1.ciphertext).not.toBe(result2.ciphertext);
    });

    test("decryptMessage should recover original plaintext", async () => {
      const plaintext = "Test message for decryption";
      const encrypted = await crypto.encryptMessage(plaintext, symmetricKey);

      const decrypted = await crypto.decryptMessage(
        encrypted.ciphertext,
        encrypted.iv,
        symmetricKey
      );

      expect(decrypted).toBe(plaintext);
    });

    test("decryptMessage should fail with tampered ciphertext", async () => {
      const plaintext = "Secure message";
      const encrypted = await crypto.encryptMessage(plaintext, symmetricKey);

      // Tamper with ciphertext
      const tamperedCiphertext = encrypted.ciphertext.slice(0, -4) + "XXXX";

      await expect(
        crypto.decryptMessage(tamperedCiphertext, encrypted.iv, symmetricKey)
      ).rejects.toThrow("Failed to decrypt message");
    });

    test("decryptMessage should fail with wrong IV", async () => {
      const plaintext = "Another secure message";
      const encrypted = await crypto.encryptMessage(plaintext, symmetricKey);

      // Use completely different IV
      const wrongIV = await crypto.encryptMessage("dummy", symmetricKey);

      await expect(
        crypto.decryptMessage(encrypted.ciphertext, wrongIV.iv, symmetricKey)
      ).rejects.toThrow("Failed to decrypt message");
    });
  });

  describe("Asymmetric Encryption (RSA-OAEP)", () => {
    let senderKeyPair: any;
    let recipientKeyPair: any;

    beforeEach(async () => {
      senderKeyPair = await crypto.generateKeyPair();
      recipientKeyPair = await crypto.generateKeyPair();
    });

    test("encryptWithPublicKey should encrypt data", async () => {
      const testData = new TextEncoder().encode("Test encryption");

      const encrypted = await crypto.encryptWithPublicKey(
        testData,
        recipientKeyPair.publicKey
      );

      expect(encrypted).toBeInstanceOf(ArrayBuffer);
      expect(encrypted.byteLength).toBeGreaterThan(0);
    });

    test("decryptWithPrivateKey should decrypt RSA-encrypted data", async () => {
      const testData = new TextEncoder().encode("Test decryption");

      const encrypted = await crypto.encryptWithPublicKey(
        testData,
        recipientKeyPair.publicKey
      );

      const decrypted = await crypto.decryptWithPrivateKey(
        encrypted,
        recipientKeyPair.privateKey
      );

      expect(decrypted).toEqual(testData.buffer);
    });

    test("decryptWithPrivateKey should fail with wrong private key", async () => {
      const testData = new TextEncoder().encode("Secret");

      const encrypted = await crypto.encryptWithPublicKey(
        testData,
        recipientKeyPair.publicKey
      );

      // Try decrypting with wrong private key
      await expect(
        crypto.decryptWithPrivateKey(encrypted, senderKeyPair.privateKey)
      ).rejects.toThrow();
    });

    test("different RSA encryptions produce different results", async () => {
      const testData = new TextEncoder().encode("Same data");

      const encrypted1 = await crypto.encryptWithPublicKey(
        testData,
        recipientKeyPair.publicKey
      );

      const encrypted2 = await crypto.encryptWithPublicKey(
        testData,
        recipientKeyPair.publicKey
      );

      // RSA-OAEP uses randomization, so ciphertexts should differ
      expect(
        new Uint8Array(encrypted1).join(",")
      ).not.toBe(new Uint8Array(encrypted2).join(","));
    });
  });

  describe("Base64 Encoding/Decoding", () => {
    test("arrayBufferToBase64 should encode ArrayBuffer", () => {
      const buffer = new TextEncoder().encode("test");
      const base64 = crypto.arrayBufferToBase64(buffer.buffer);

      expect(typeof base64).toBe("string");
      expect(base64.length).toBeGreaterThan(0);
    });

    test("base64ToArrayBuffer should decode base64 string", () => {
      const original = "Hello, Base64!";
      const encoded = crypto.arrayBufferToBase64(
        new TextEncoder().encode(original).buffer
      );

      const decoded = new TextDecoder().decode(
        crypto.base64ToArrayBuffer(encoded)
      );

      expect(decoded).toBe(original);
    });

    test("encoding and decoding should be reversible", () => {
      const testData = new Uint8Array([1, 2, 3, 255, 254, 0, 128]);
      const encoded = crypto.arrayBufferToBase64(testData.buffer);
      const decoded = new Uint8Array(crypto.base64ToArrayBuffer(encoded));

      expect(decoded).toEqual(testData);
    });
  });

  describe("Key Export/Import", () => {
    test("exportSymmetricKey and importSymmetricKey should be reversible", async () => {
      const key1 = await crypto.generateSymmetricKey();
      const exported = await crypto.exportSymmetricKey(key1);
      const key2 = await crypto.importSymmetricKey(exported);

      // Both keys should encrypt/decrypt the same way
      const testMessage = "Reversibility test";
      const encrypted1 = await crypto.encryptMessage(testMessage, key1);
      const encrypted2 = await crypto.encryptMessage(testMessage, key2);

      const decrypted1 = await crypto.decryptMessage(
        encrypted1.ciphertext,
        encrypted1.iv,
        key1
      );
      const decrypted2 = await crypto.decryptMessage(
        encrypted2.ciphertext,
        encrypted2.iv,
        key2
      );

      expect(decrypted1).toBe(testMessage);
      expect(decrypted2).toBe(testMessage);
    });
  });

  describe("Hash Function", () => {
    test("hashData should produce SHA-256 hash", async () => {
      const data = "Test data for hashing";
      const hash = await crypto.hashData(data);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    test("same data should produce same hash", async () => {
      const data = "Consistent data";

      const hash1 = await crypto.hashData(data);
      const hash2 = await crypto.hashData(data);

      expect(hash1).toBe(hash2);
    });

    test("different data should produce different hash", async () => {
      const hash1 = await crypto.hashData("Data 1");
      const hash2 = await crypto.hashData("Data 2");

      expect(hash1).not.toBe(hash2);
    });
  });
});

describe("Crypto Utilities - Integration Tests", () => {
  describe("Message Payload Encryption/Decryption", () => {
    let senderKeyPair: any;
    let recipientKeyPair: any;

    beforeEach(async () => {
      senderKeyPair = await crypto.generateKeyPair();
      recipientKeyPair = await crypto.generateKeyPair();
    });

    test("prepareMessagePayload should create valid payload", async () => {
      const plaintext = "Hello, encrypted world!";

      const payload = await crypto.prepareMessagePayload(
        plaintext,
        recipientKeyPair.publicKey,
        senderKeyPair.publicKey
      );

      expect(payload).toHaveProperty("ciphertext");
      expect(payload).toHaveProperty("iv");
      expect(payload).toHaveProperty("encryptedKey");
      expect(payload).toHaveProperty("encryptedKeyForSelf");

      expect(typeof payload.ciphertext).toBe("string");
      expect(typeof payload.iv).toBe("string");
      expect(typeof payload.encryptedKey).toBe("string");
      expect(typeof payload.encryptedKeyForSelf).toBe("string");
    });

    test("recipient should decrypt message using prepareMessagePayload", async () => {
      const plaintext = "Secret message for recipient";

      const payload = await crypto.prepareMessagePayload(
        plaintext,
        recipientKeyPair.publicKey,
        senderKeyPair.publicKey
      );

      // Recipient decrypts using their private key (not sender)
      const decrypted = await crypto.decryptMessagePayload(
        payload,
        recipientKeyPair.privateKey,
        false // isSender = false
      );

      expect(decrypted).toBe(plaintext);
    });

    test("sender should decrypt message using prepareMessagePayload", async () => {
      const plaintext = "Message I sent to track in my history";

      const payload = await crypto.prepareMessagePayload(
        plaintext,
        recipientKeyPair.publicKey,
        senderKeyPair.publicKey
      );

      // Sender decrypts using their private key (for history)
      const decrypted = await crypto.decryptMessagePayload(
        payload,
        senderKeyPair.privateKey,
        true // isSender = true
      );

      expect(decrypted).toBe(plaintext);
    });

    test("recipient cannot decrypt with encryptedKeyForSelf", async () => {
      const plaintext = "Test message";

      const payload = await crypto.prepareMessagePayload(
        plaintext,
        recipientKeyPair.publicKey,
        senderKeyPair.publicKey
      );

      // Try to decrypt with recipient key but wrong encrypted key flag
      await expect(
        crypto.decryptMessagePayload(
          payload,
          recipientKeyPair.privateKey,
          true // Wrong: should be false for recipient
        )
      ).rejects.toThrow();
    });

    test("sender cannot decrypt with recipient's private key", async () => {
      const plaintext = "Another test";

      const payload = await crypto.prepareMessagePayload(
        plaintext,
        recipientKeyPair.publicKey,
        senderKeyPair.publicKey
      );

      // Sender tries to decrypt with recipient's key (should fail)
      await expect(
        crypto.decryptMessagePayload(
          payload,
          recipientKeyPair.privateKey,
          true // Even with correct flag
        )
      ).rejects.toThrow();
    });

    test("End-to-end: Full conversation flow", async () => {
      const alice = await crypto.generateKeyPair();
      const bob = await crypto.generateKeyPair();

      // Alice sends message to Bob
      const message1 = "Hi Bob, this is Alice!";
      const payload1 = await crypto.prepareMessagePayload(
        message1,
        bob.publicKey,
        alice.publicKey
      );

      // Bob receives and decrypts
      const received1 = await crypto.decryptMessagePayload(
        payload1,
        bob.privateKey,
        false
      );
      expect(received1).toBe(message1);

      // Alice can see her own message in history
      const alice_sees_own = await crypto.decryptMessagePayload(
        payload1,
        alice.privateKey,
        true
      );
      expect(alice_sees_own).toBe(message1);

      // Bob replies to Alice
      const message2 = "Hi Alice! Great to hear from you.";
      const payload2 = await crypto.prepareMessagePayload(
        message2,
        alice.publicKey,
        bob.publicKey
      );

      // Alice receives and decrypts
      const received2 = await crypto.decryptMessagePayload(
        payload2,
        alice.privateKey,
        false
      );
      expect(received2).toBe(message2);

      // Bob can see his own message in history
      const bob_sees_own = await crypto.decryptMessagePayload(
        payload2,
        bob.privateKey,
        true
      );
      expect(bob_sees_own).toBe(message2);
    });

    test("Large message encryption/decryption", async () => {
      const largeMessage = "X".repeat(10000); // 10KB message

      const payload = await crypto.prepareMessagePayload(
        largeMessage,
        recipientKeyPair.publicKey,
        senderKeyPair.publicKey
      );

      const decrypted = await crypto.decryptMessagePayload(
        payload,
        recipientKeyPair.privateKey,
        false
      );

      expect(decrypted).toBe(largeMessage);
    });

    test("Special characters and Unicode", async () => {
      const specialMessage =
        "Special chars: !@#$%^&*() Unicode: 你好世界 🔐 Émojis: 🚀💻";

      const payload = await crypto.prepareMessagePayload(
        specialMessage,
        recipientKeyPair.publicKey,
        senderKeyPair.publicKey
      );

      const decrypted = await crypto.decryptMessagePayload(
        payload,
        recipientKeyPair.privateKey,
        false
      );

      expect(decrypted).toBe(specialMessage);
    });

    test("Multiple messages with same key pair", async () => {
      const messages = [
        "Message 1",
        "Message 2",
        "Message 3",
        "Message 4",
        "Message 5",
      ];

      const payloads = await Promise.all(
        messages.map((msg) =>
          crypto.prepareMessagePayload(
            msg,
            recipientKeyPair.publicKey,
            senderKeyPair.publicKey
          )
        )
      );

      const decrypted = await Promise.all(
        payloads.map((payload) =>
          crypto.decryptMessagePayload(
            payload,
            recipientKeyPair.privateKey,
            false
          )
        )
      );

      expect(decrypted).toEqual(messages);
    });
  });

  describe("Encryption with Payload Tampering", () => {
    let keyPair: any;

    beforeEach(async () => {
      keyPair = await crypto.generateKeyPair();
    });

    test("Tampered ciphertext should fail decryption", async () => {
      const plaintext = "Original message";

      const payload = await crypto.prepareMessagePayload(
        plaintext,
        keyPair.publicKey,
        keyPair.publicKey
      );

      // Tamper with ciphertext
      const tamperedPayload = {
        ...payload,
        ciphertext: payload.ciphertext.slice(0, -4) + "XXXX",
      };

      await expect(
        crypto.decryptMessagePayload(tamperedPayload, keyPair.privateKey, false)
      ).rejects.toThrow();
    });

    test("Tampered IV should fail decryption", async () => {
      const plaintext = "Another message";

      const payload = await crypto.prepareMessagePayload(
        plaintext,
        keyPair.publicKey,
        keyPair.publicKey
      );

      // Tamper with IV
      const tamperedPayload = {
        ...payload,
        iv: payload.iv.slice(0, -4) + "YYYY",
      };

      await expect(
        crypto.decryptMessagePayload(tamperedPayload, keyPair.privateKey, false)
      ).rejects.toThrow();
    });
  });

  describe("Performance and Stress Tests", () => {
    let keyPair: any;

    beforeEach(async () => {
      keyPair = await crypto.generateKeyPair();
    });

    test("Rapid encryption/decryption should work", async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          (async () => {
            const payload = await crypto.prepareMessagePayload(
              `Message ${i}`,
              keyPair.publicKey,
              keyPair.publicKey
            );

            return crypto.decryptMessagePayload(
              payload,
              keyPair.privateKey,
              false
            );
          })()
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toBe(`Message ${index}`);
      });
    });
  });
});

// Export for test runner
export {};
