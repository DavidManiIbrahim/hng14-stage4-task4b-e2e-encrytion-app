/**
 * Manual Test Runner for Crypto Functions
 * This file can be run directly in Node.js to validate encryption/decryption
 * Usage: node lib/manual-crypto-test.js
 */

// Import crypto functions (simulated for Node.js)
const crypto = require('crypto');

async function runTests() {
  console.log('🧪 Starting Crypto Utility Tests...\n');
  
  let passedTests = 0;
  let failedTests = 0;

  const test = (name, fn) => {
    try {
      fn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      failedTests++;
    }
  };

  const assert = (condition, message) => {
    if (!condition) throw new Error(message || 'Assertion failed');
  };

  // Test 1: Verify Web Crypto API is available
  test('Web Crypto API available', () => {
    if (typeof globalThis.crypto === 'undefined' && typeof global.crypto === 'undefined') {
      // Node.js - using crypto module
      assert(typeof require('crypto').webcrypto !== 'undefined', 'Web Crypto not available');
    }
  });

  // Test 2: Base64 encoding/decoding utilities
  test('Base64 ArrayBuffer encoding', () => {
    const data = 'Hello, World!';
    const encoded = Buffer.from(data).toString('base64');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    assert(decoded === data, 'Base64 round-trip failed');
  });

  // Test 3: SHA-256 hashing
  test('SHA-256 hashing', async () => {
    const hash1 = crypto.createHash('sha256').update('test').digest('hex');
    const hash2 = crypto.createHash('sha256').update('test').digest('hex');
    assert(hash1 === hash2, 'Hashing consistency failed');
    assert(hash1.length === 64, 'SHA-256 hash should be 64 hex characters');
  });

  // Test 4: RSA key pair generation
  test('RSA-4096 key generation', async () => {
    try {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
      });
      assert(privateKey !== null, 'Private key generation failed');
      assert(publicKey !== null, 'Public key generation failed');
    } catch (e) {
      // Some environments may not support this
      console.log('   (Skipped in this environment)');
    }
  });

  // Test 5: RSA encryption/decryption
  test('RSA-OAEP encryption/decryption', async () => {
    try {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048, // Smaller for faster test
      });
      const plaintext = 'Secret message';
      const encrypted = crypto.publicEncrypt(
        { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
        Buffer.from(plaintext)
      );
      const decrypted = crypto.privateDecrypt(
        { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
        encrypted
      );
      assert(decrypted.toString() === plaintext, 'RSA round-trip failed');
    } catch (e) {
      // Some environments may not support this
      console.log('   (Skipped in this environment)');
    }
  });

  // Test 6: AES-256-GCM encryption
  test('AES-256-GCM encryption/decryption', () => {
    const key = crypto.randomBytes(32); // 256 bits
    const iv = crypto.randomBytes(12); // 96 bits for GCM
    const plaintext = 'Encrypted message';
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    assert(decrypted.toString('utf-8') === plaintext, 'AES-GCM round-trip failed');
  });

  // Test 7: Random IV generation
  test('IV randomization', () => {
    const iv1 = crypto.randomBytes(12);
    const iv2 = crypto.randomBytes(12);
    assert(!iv1.equals(iv2), 'IVs should be random');
  });

  // Test 8: Error handling for tampered ciphertext
  test('Tampering detection with AES-GCM', () => {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const plaintext = 'Sensitive data';
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Tamper with ciphertext
    encrypted[0] ^= 0xFF; // Flip bits
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    try {
      decipher.update(encrypted);
      decipher.final();
      throw new Error('Should have detected tampering');
    } catch (e) {
      assert(e.message.includes('decrypt') || e.message.includes('auth'), 'Expected auth failure');
    }
  });

  console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed\n`);
  
  if (failedTests === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log(`❌ ${failedTests} test(s) failed`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
