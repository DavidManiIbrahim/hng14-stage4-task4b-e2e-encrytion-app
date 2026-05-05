"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, AlertCircle, Wifi } from "lucide-react";
import { useAuth } from "./AuthContext";
import * as types from "@/lib/types";
import * as api from "@/lib/api";
import * as crypto from "@/lib/crypto";

interface ConversationViewProps {
  selectedUserId: string;
}

interface DisplayedMessage extends types.DecryptedMessage {}

export function ConversationView({ selectedUserId }: ConversationViewProps) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<DisplayedMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [recipientUser, setRecipientUser] = useState<types.User | null>(null);
  const [usersCache, setUsersCache] = useState<Map<string, types.User>>(
    new Map()
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load recipient user info and all users for caching
  useEffect(() => {
    if (!token) return;

    const loadUsersAndRecipient = async () => {
      try {
        const allUsers = await api.listUsers(token);
        const cache = new Map(allUsers.map((u) => [u.id, u]));
        setUsersCache(cache);

        const recipient = cache.get(selectedUserId);
        setRecipientUser(recipient || null);
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    };

    loadUsersAndRecipient();
  }, [selectedUserId, token]);

  // Load messages
  useEffect(() => {
    if (!token || !user) return;

    const loadMessages = async () => {
      try {
        const encryptedMessages = await api.getConversation(token, selectedUserId);
        const privateKey = await crypto.getPrivateKey();

        if (!privateKey) {
          setError("Private key not found. Cannot decrypt messages.");
          return;
        }

        const decrypted: DisplayedMessage[] = [];

        for (const msg of encryptedMessages) {
          try {
            // Only decrypt if current user is the recipient
            // (symmetric key was encrypted with recipient's public key)
            if (msg.recipientId !== user.id) {
              // This is a message we sent - we have the plaintext locally
              // Skip decryption as the symmetric key was encrypted with recipient's public key
              continue;
            }

            // Decrypt the symmetric key with our private key
            const decryptedSymKeyBuffer = await crypto.decryptWithPrivateKey(
              crypto.base64ToArrayBuffer(msg.encryptedSymmetricKey),
              privateKey
            );

            // Import the symmetric key
            const symmetricKey = await crypto.importSymmetricKey(
              decryptedSymKeyBuffer
            );

            // Decrypt the message content
            const decryptedContent = await crypto.decryptMessage(
              msg.encryptedContent,
              msg.encryptedContentIv,
              symmetricKey
            );

            // Get sender info from cache
            const senderInfo = usersCache.get(msg.senderId);

            decrypted.push({
              id: msg.id,
              senderId: msg.senderId,
              senderUsername: senderInfo?.username || "Unknown",
              content: decryptedContent,
              timestamp: msg.timestamp,
              read: msg.read,
            });
          } catch (err) {
            console.error("Failed to decrypt message:", err);
            decrypted.push({
              id: msg.id,
              senderId: msg.senderId,
              senderUsername: "Unknown",
              content: "[Failed to decrypt]",
              timestamp: msg.timestamp,
              read: msg.read,
            });
          }
        }

        setMessages(decrypted.sort((a, b) => a.timestamp - b.timestamp));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [token, selectedUserId, usersCache, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() || !token || !user) return;

    setError("");
    setIsLoading(true);

    try {
      // Get recipient's public key
      const recipientPublicKey = await api.getUserPublicKey(selectedUserId);

      // Generate a symmetric key
      const symmetricKey = await crypto.generateSymmetricKey();

      // Encrypt the message with symmetric key
      const { ciphertext, iv } = await crypto.encryptMessage(messageText, symmetricKey);

      // Export symmetric key to encrypt with recipient's public key
      const symmetricKeyBuffer = await crypto.exportSymmetricKey(symmetricKey);

      // Encrypt the symmetric key with recipient's public key
      const encryptedSymKey = await crypto.encryptWithPublicKey(
        symmetricKeyBuffer,
        recipientPublicKey
      );

      // Send encrypted message
      await api.sendMessage(
        token,
        selectedUserId,
        crypto.arrayBufferToBase64(encryptedSymKey),
        ciphertext,
        iv
      );

      // Add message to display
      const newMessage: DisplayedMessage = {
        id: Math.random().toString(36),
        senderId: user.id,
        senderUsername: user.username,
        content: messageText,
        timestamp: Date.now(),
        read: true,
      };

      setMessages([...messages, newMessage]);
      setMessageText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {recipientUser?.username || selectedUserId}
          </h2>
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" />
            End-to-End Encrypted
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.senderId === user?.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.senderId === user?.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-gray-900"
                }`}
              >
                {msg.senderId !== user?.id && (
                  <p className="text-xs font-semibold mb-1 opacity-75">
                    {msg.senderUsername}
                  </p>
                )}
                <p className="break-words">{msg.content}</p>
                <p className="text-xs mt-1 opacity-75">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !messageText.trim()}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isLoading ? "Sending..." : <><Send className="w-4 h-4" />Send</> }
          </button>
        </div>
      </form>
    </div>
  );
}
