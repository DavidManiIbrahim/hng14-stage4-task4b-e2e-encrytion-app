// Type definitions for E2EE messaging app

export interface User {
  id: string;
  username: string;
  email: string;
  publicKey: JsonWebKey;
  createdAt: number;
}

export interface StoredUser extends User {
  passwordHash: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  ciphertext: string; // AES-256-GCM encrypted message
  iv: string; // 96-bit IV for AES-GCM
  encryptedKey: string; // RSA-OAEP wrapped key for recipient
  encryptedKeyForSelf: string; // RSA-OAEP wrapped key for sender (allows sender to view sent messages)
  timestamp: number;
  read: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  otherUserId: string;
  lastMessage: Message | null;
  lastUpdated: number;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface MessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

export interface KeyResponse {
  success: boolean;
  publicKey?: JsonWebKey;
  error?: string;
}

export interface ConversationData {
  id: string;
  otherUser: User;
  messages: Message[];
}

export interface DecryptedMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: number;
  read: boolean;
}
