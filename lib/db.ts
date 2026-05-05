// In-memory database for demo purposes
// With file-based persistence for server restarts
// In production, use a real database like PostgreSQL, MongoDB, etc.

import * as types from "@/lib/types";
import crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// Persistence paths
const DB_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DB_DIR, "users.json");
const SESSIONS_FILE = path.join(DB_DIR, "sessions.json");
const MESSAGES_FILE = path.join(DB_DIR, "messages.json");

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// Load data from files
function loadFromFiles() {
  ensureDataDir();

  if (fs.existsSync(USERS_FILE)) {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    for (const [key, value] of Object.entries(data)) {
      users.set(key, value as StoredUserData);
    }
  }

  if (fs.existsSync(SESSIONS_FILE)) {
    const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
    for (const [key, value] of Object.entries(data)) {
      sessions.set(key, value as { userId: string; expiresAt: number });
    }
  }

  if (fs.existsSync(MESSAGES_FILE)) {
    const data = JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf-8"));
    for (const [key, value] of Object.entries(data)) {
      messages.set(key, value as StoredMessageData);
    }
  }
}

// Save data to files
function saveUsers() {
  ensureDataDir();
  const data = Object.fromEntries(users);
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

function saveSessions() {
  ensureDataDir();
  const data = Object.fromEntries(sessions);
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2));
}

function saveMessages() {
  ensureDataDir();
  const data = Object.fromEntries(messages);
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(data, null, 2));
}

interface StoredUserData extends types.StoredUser {
  passwordHash: string;
}

interface StoredMessageData extends types.Message {}

// In-memory storage
const users: Map<string, StoredUserData> = new Map();
const messages: Map<string, StoredMessageData> = new Map();
const sessions: Map<string, { userId: string; expiresAt: number }> = new Map();

// Load persisted data on startup
loadFromFiles();

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function registerUserInDb(
  username: string,
  email: string,
  password: string,
  publicKey: JsonWebKey
): { token: string; user: types.User } | null {
  // Check if user already exists
  for (const user of users.values()) {
    if (user.email === email || user.username === username) {
      return null;
    }
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);

  const user: StoredUserData = {
    id: userId,
    username,
    email,
    publicKey,
    passwordHash,
    createdAt: Date.now(),
  };

  users.set(userId, user);
  saveUsers();

  const token = generateToken();
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  saveSessions();

  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    token,
    user: userWithoutPassword,
  };
}

export function loginUserInDb(
  email: string,
  password: string
): { token: string; user: types.User } | null {
  const passwordHash = hashPassword(password);

  for (const user of users.values()) {
    if (user.email === email && user.passwordHash === passwordHash) {
      const token = generateToken();
      sessions.set(token, {
        userId: user.id,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      saveSessions();

      const { passwordHash: _, ...userWithoutPassword } = user;
      return {
        token,
        user: userWithoutPassword,
      };
    }
  }

  return null;
}

export function getUserFromToken(token: string): types.User | null {
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    saveSessions();
    return null;
  }

  const user = users.get(session.userId);
  if (!user) {
    sessions.delete(token);
    saveSessions();
    return null;
  }

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export function getUserById(id: string): types.User | null {
  const user = users.get(id);
  if (!user) return null;

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export function getAllUsers(): types.User[] {
  return Array.from(users.values()).map((user) => {
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
}

export function searchUsersByQuery(query: string): types.User[] {
  const lowerQuery = query.toLowerCase();
  return Array.from(users.values())
    .filter(
      (user) =>
        user.username.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
    )
    .map((user) => {
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
}

export function updatePublicKeyInDb(
  userId: string,
  publicKey: JsonWebKey
): boolean {
  const user = users.get(userId);
  if (!user) return false;

  user.publicKey = publicKey;
  saveUsers();
  return true;
}

export function storeMessage(
  senderId: string,
  recipientId: string,
  encryptedSymmetricKey: string,
  encryptedContent: string,
  encryptedContentIv: string
): types.Message {
  const messageId = crypto.randomUUID();
  const message: StoredMessageData = {
    id: messageId,
    senderId,
    recipientId,
    encryptedSymmetricKey,
    encryptedContent,
    encryptedContentIv,
    timestamp: Date.now(),
    read: false,
  };

  messages.set(messageId, message);
  saveMessages();
  return message;
}

export function getMessagesBetween(
  userId1: string,
  userId2: string
): types.Message[] {
  return Array.from(messages.values()).filter(
    (msg) =>
      (msg.senderId === userId1 && msg.recipientId === userId2) ||
      (msg.senderId === userId2 && msg.recipientId === userId1)
  );
}

export function getMessagesForUser(userId: string): types.Message[] {
  return Array.from(messages.values()).filter(
    (msg) => msg.recipientId === userId
  );
}

export function markMessageAsRead(messageId: string): boolean {
  const message = messages.get(messageId);
  if (!message) return false;

  message.read = true;
  saveMessages();
  return true;
}

export function getConversationsForUser(userId: string): types.Conversation[] {
  const userMessages = Array.from(messages.values()).filter(
    (msg) => msg.senderId === userId || msg.recipientId === userId
  );

  const conversationMap = new Map<string, types.Conversation>();

  for (const message of userMessages) {
    const otherUserId =
      message.senderId === userId ? message.recipientId : message.senderId;
    const convId = [userId, otherUserId].sort().join("-");

    if (!conversationMap.has(convId)) {
      conversationMap.set(convId, {
        id: convId,
        userId,
        otherUserId,
        lastMessage: message,
        lastUpdated: message.timestamp,
      });
    } else {
      const conv = conversationMap.get(convId)!;
      if (message.timestamp > conv.lastUpdated) {
        conv.lastMessage = message;
        conv.lastUpdated = message.timestamp;
      }
    }
  }

  return Array.from(conversationMap.values());
}
