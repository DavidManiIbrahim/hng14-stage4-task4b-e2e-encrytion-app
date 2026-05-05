"use client";

import React, { useState, useEffect, useRef } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "./AuthContext";
import * as types from "@/lib/types";
import * as api from "@/lib/api";
import * as crypto from "@/lib/crypto";
import { UserList } from "./UserList";
import { ConversationView } from "./ConversationView";

export function MessagingApp() {
  const { user, token, logout } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<types.User[]>([]);
  const [conversations, setConversations] = useState<types.Conversation[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const loadUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const fetchedUsers = await api.listUsers(token);
        setUsers(fetchedUsers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
    const interval = setInterval(loadUsers, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const loadConversations = async () => {
      try {
        const convs = await api.getConversations(token);
        setConversations(convs);
      } catch (err) {
        console.error("Failed to load conversations:", err);
      }
    };

    loadConversations();
    const interval = setInterval(loadConversations, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [token]);

  if (!user || !token) {
    return null;
  }

  return (
    <div className="flex h-full bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">{user.username}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1 bg-red-500 hover:bg-red-700 text-white text-sm rounded flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-bold text-gray-700 mb-3">Conversations</h3>
            {conversations.length === 0 ? (
              <p className="text-gray-500 text-sm">No conversations yet</p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedUserId(conv.otherUserId)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedUserId === conv.otherUserId
                        ? "bg-blue-100 border-l-4 border-blue-500"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <p className="font-semibold text-sm text-gray-900">
                      {conv.otherUserId}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-xs text-gray-500 truncate">
                        {conv.lastMessage.encryptedContent.substring(0, 30)}...
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedUserId ? (
          <ConversationView selectedUserId={selectedUserId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Secure Messaging
              </h2>
              <p className="text-gray-600 mb-8">
                Select a conversation or start a new one
              </p>
              <div className="max-w-md w-full">
                <UserList
                  users={users}
                  isLoading={isLoadingUsers}
                  onSelectUser={(userId) => setSelectedUserId(userId)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
