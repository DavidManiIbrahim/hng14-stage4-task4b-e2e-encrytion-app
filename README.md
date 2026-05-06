# E2E Encryption Chat App

A secure end-to-end encrypted messaging application built with Next.js, featuring hybrid RSA-OAEP and AES-256-GCM encryption for private conversations.

## Features

- **End-to-End Encryption**: Hybrid encryption using RSA-4096 (key wrapping) and AES-256-GCM (bulk encryption)
- **Real-Time Messaging**: Live chat interface with instant message updates
- **User Management**: User registration, login, and conversation management
- **Dual Key Storage**: Sender can decrypt sent messages (encryptedKeyForSelf), recipient decrypts with their private key
- **Modern UI**: React with Tailwind CSS and Lucide icons
- **Responsive Design**: Works on desktop and mobile devices
- **Tested Crypto**: Comprehensive test coverage for encryption/decryption flows

## Architecture

### Architecture Diagram

```
Client Browser                    Server
--------------                    ------
  [User Register/Login]           [Auth API]
         |                             |
         |-- public key upload ------->|
         |                             |
         |<-- user list / public keys--|
         |                             |
  [User writes message]             [Store encrypted payload]
         |                             |
  [prepareMessagePayload()]         |
         |                             |
  [AES-GCM encrypt message]         |
  [RSA-OAEP wrap AES key for]       |
       - recipient                    |
       - sender                       |
         |                             |
  [POST ciphertext + wrapped keys]->|
         |                             |
  [GET encrypted conversation]      |
         |<---------------------------|
  [decryptMessagePayload()]         |
  [AES-GCM decrypt plaintext]       |
```

### Encryption Flow Explanation

1. User generates an RSA-4096 key pair on the client during registration.
2. The public key is sent to the backend and stored with the user profile.
3. The private key is kept only in the browser's IndexedDB and never leaves the client.
4. When sending a message:
   - A fresh AES-256-GCM symmetric key is generated.
   - The plaintext is encrypted with AES-GCM using a unique 96-bit IV.
   - The raw AES key is wrapped with RSA-OAEP using the recipient's public key.
   - The same AES key is also wrapped with the sender's public key so the sender can decrypt sent messages later.
   - The backend stores only the ciphertext, IV, and wrapped keys.
5. When receiving a message:
   - The recipient fetches the encrypted payload.
   - The private RSA key unwraps the appropriate RSA-OAEP encrypted AES key.
   - The unwrapped AES key decrypts the ciphertext with AES-GCM.
   - If decryption fails, the message is marked as failed without exposing plaintext.

### Key Management Explanation

- **Public Key**: Stored on the server and shared with other users for encryption.
- **Private Key**: Generated and stored locally in IndexedDB using the browser Web Crypto API.
- **Key Security**: The private key is kept client-side; the server never receives raw private key material.
- **Key Usage**: Each message uses a new symmetric AES key; RSA keys are used only for key wrapping.
- **JWK Handling**: The code removes the `alg` field from JWK objects before importing keys to avoid browser import conflicts.

### Message Payload Format
```typescript
{
  ciphertext: string,          // Base64 AES-GCM encrypted plaintext
  iv: string,                  // Base64 96-bit random IV
  encryptedKey: string,        // Base64 RSA-OAEP wrapped key for recipient
  encryptedKeyForSelf: string  // Base64 RSA-OAEP wrapped key for sender
}
```

### Tech Stack
- **Framework**: Next.js 16.2.4 (Turbopack)
- **Language**: TypeScript
- **Frontend**: React 19 with Tailwind CSS
- **Crypto**: Web Crypto API (native browser)
- **Database**: JSON file persistence (.data directory)
- **Testing**: Jest with comprehensive test suite

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   - Navigate to [http://localhost:3000](http://localhost:3000)

### Available Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm test` - Run Jest test suite
- `npm run lint` - Run ESLint

## Usage

### Registration & Login
1. Create a new account with email and password
2. Your RSA-4096 key pair is generated and stored securely in IndexedDB
3. Login with your credentials

### Sending Messages
1. Select a user from the contacts list
2. Type your message in the input field
3. Press Send
4. Message is encrypted with AES-GCM, wrapped with recipient's RSA public key
5. Only the recipient with their private key can decrypt

### Receiving Messages
1. Messages are automatically fetched every 5 seconds
2. System decrypts using your private key and `encryptedKey` field
3. Plaintext messages display in the conversation view
4. You can also decrypt your sent messages using `encryptedKeyForSelf`

## Project Structure

```
app/
  ├── api/                 # API routes
  │   ├── auth/           # Authentication endpoints
  │   ├── messages/       # Message sending
  │   ├── conversations/  # Conversation management
  │   └── users/          # User endpoints
  ├── page.tsx            # Main page
  └── globals.css         # Global styles

components/
  ├── AuthPage.tsx        # Login/Register UI
  ├── ConversationView.tsx # Chat interface with doodle background
  ├── MessagingApp.tsx    # Main app component
  └── AuthContext.tsx     # Auth state management

lib/
  ├── crypto.ts           # Encryption utilities (515 lines)
  │   ├── generateKeyPair()
  │   ├── prepareMessagePayload()
  │   ├── decryptMessagePayload()
  │   └── receiveMessages()
  ├── db.ts               # Server-side persistence
  ├── api.ts              # Client API utilities
  ├── types.ts            # TypeScript interfaces
  └── manual-crypto-test.js # Crypto validation tests

public/
  ├── e2e.png             # App logo
  └── *.svg               # Additional assets
```

## Key Functions

### `prepareMessagePayload(plaintext, recipientPublicKeyJwk, senderPublicKeyJwk)`
Orchestration function that:
1. Generates fresh AES-256 key per message
2. Encrypts plaintext with AES-GCM
3. RSA-wraps key for recipient (encryptedKey)
4. RSA-wraps key for sender (encryptedKeyForSelf)
5. Returns complete encrypted payload ready for transmission

### `decryptMessagePayload(payload, privateKeyJwk, isSender)`
Decryption function that:
1. Selects correct encrypted key based on isSender flag
2. RSA-OAEP unwraps to recover AES key
3. AES-GCM decrypts the message
4. Returns plaintext or throws detailed error on failure

### `receiveMessages(currentUserId, privateKeyJwk?)`
Bulk decryption function that:
1. Fetches all conversations and their messages
2. Decrypts each message with role detection (sender vs recipient)
3. Gracefully handles individual message failures
4. Returns sorted plaintext message array

## Security Considerations

- **JWK Handling**: Algorithm field is stripped before importKey() to prevent conflicts
- **IV Randomization**: Each message gets a unique 96-bit random IV
- **Tampering Detection**: AES-GCM authentication tag detects any modifications
- **No Key Server**: Private keys never leave the user's device
- **Dual Encryption**: Both sender and recipient can retrieve message history

## Security Trade-offs

- **IndexedDB private key storage** is convenient for browser clients, but it is less secure than hardware-backed storage or secure enclaves.
- **No forward secrecy** is implemented: each message is encrypted with a fresh AES key, but RSA key pairs are reused across messages.
- **JSON file storage** on the backend is acceptable for development, but it is not production-grade storage for sensitive metadata.
- **Hybrid RSA + AES** trades computational overhead for compatibility and simplicity; it is strong for point-to-point messaging but not optimized for large-group chat or ephemeral session keys.
- **Local key management** means private keys are device-bound; user recovery across devices is not part of this demo.

## Known Limitations

- Private keys are only available on the browser device where they were generated; messages cannot be decrypted on another device unless keys are transferred separately.
- There is no built-in key rotation or revocation mechanism.
- The app does not yet enforce HTTPS in development mode.
- Replay protection and advanced metadata privacy are not implemented.
- The backend stores encrypted payloads in local JSON files, which is not suitable for a production deployment.
- Group chat support is not implemented; this is a one-to-one messaging demo.

## Testing

Run the comprehensive test suite:
```bash
npm test
```

Test coverage includes:
- RSA key generation and encryption/decryption
- AES-256-GCM symmetric encryption
- Base64 encoding/decoding
- Message payload encryption/decryption
- Tampering detection
- Full conversation flows
- Large messages (10KB+)
- Unicode/emoji support

## Development Notes

- All encryption happens client-side using Web Crypto API
- Server stores encrypted messages but cannot decrypt them
- Database auto-creates .data directory with JSON files
- Error handling gracefully degrades for individual message failures
- Doodle-style SVG background enhances the chat UI
