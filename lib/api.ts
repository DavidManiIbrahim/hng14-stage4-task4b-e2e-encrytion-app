// API utilities for E2EE messaging app

import * as types from "./types";

const BASE_URL = "/api";

interface ApiOptions {
  token?: string;
  method?: string;
  body?: any;
}

async function apiCall(
  endpoint: string,
  options: ApiOptions = {}
): Promise<any> {
  const { token, method = "GET", body } = options;

  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, config);
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : "Failed to fetch API endpoint"
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "API request failed");
  }

  return response.json();
}

// Auth APIs
export async function registerUser(
  username: string,
  email: string,
  password: string,
  publicKey: JsonWebKey
): Promise<types.AuthResponse> {
  return apiCall("/auth/register", {
    method: "POST",
    body: { username, email, password, publicKey },
  });
}

export async function loginUser(
  email: string,
  password: string
): Promise<types.AuthResponse> {
  return apiCall("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function getCurrentUser(token: string): Promise<types.User> {
  const response = await apiCall("/auth/me", { token });
  return response.user;
}

// Key management APIs
export async function getUserPublicKey(userId: string): Promise<JsonWebKey> {
  const response = await apiCall(`/keys?userId=${userId}`);
  return response.publicKey;
}

export async function updatePublicKey(
  token: string,
  publicKey: JsonWebKey
): Promise<types.KeyResponse> {
  return apiCall("/keys", {
    token,
    method: "POST",
    body: { publicKey },
  });
}

// Messaging APIs
export async function sendMessage(
  token: string,
  recipientId: string,
  encryptedSymmetricKey: string,
  encryptedContent: string,
  encryptedContentIv: string
): Promise<types.MessageResponse> {
  return apiCall("/messages/send", {
    token,
    method: "POST",
    body: {
      recipientId,
      encryptedSymmetricKey,
      encryptedContent,
      encryptedContentIv,
    },
  });
}

export async function getMessages(
  token: string,
  otherUserId?: string
): Promise<types.Message[]> {
  const url = otherUserId
    ? `/messages?otherUserId=${otherUserId}`
    : "/messages";
  const response = await apiCall(url, { token });
  return response.messages;
}

export async function getConversation(
  token: string,
  otherUserId: string
): Promise<types.Message[]> {
  const response = await apiCall(`/messages?otherUserId=${otherUserId}`, {
    token,
  });
  return response.messages;
}

export async function getConversations(
  token: string
): Promise<types.Conversation[]> {
  const response = await apiCall("/conversations", { token });
  return response.conversations;
}

// User listing API
export async function listUsers(token: string): Promise<types.User[]> {
  const response = await apiCall("/users", { token });
  return response.users;
}

export async function searchUsers(
  token: string,
  query: string
): Promise<types.User[]> {
  const response = await apiCall(`/users?q=${query}`, { token });
  return response.users;
}
