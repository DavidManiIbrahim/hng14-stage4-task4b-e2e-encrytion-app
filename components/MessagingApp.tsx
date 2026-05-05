"use client";

import React, { useState, useEffect, useRef } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "./AuthContext";
import * as types from "@/lib/types";
import * as api from "@/lib/api";
import * as crypto from "@/lib/crypto";
import { ConversationView } from "./ConversationView";

export function MessagingApp() {
  const { user, token, logout } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<types.User[]>([]);
  const [conversations, setConversations] = useState<types.Conversation[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!token) return;

    const loadUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const fetchedUsers = await api.listUsers(token);
        setUsers(fetchedUsers);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load users";
        setError(errorMessage);
        
        // If token is invalid, log out the user
        if (errorMessage.includes("Invalid token")) {
          logout();
        }
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
    const interval = setInterval(loadUsers, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [token, logout]);

  useEffect(() => {
    if (!token) return;

    const loadConversations = async () => {
      try {
        const convs = await api.getConversations(token);
        setConversations(convs);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load conversations";
        console.error("Failed to load conversations:", err);
        
        // If token is invalid, log out the user
        if (errorMessage.includes("Invalid token")) {
          logout();
        }
      }
    };

    loadConversations();
    const interval = setInterval(loadConversations, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [token, logout]);

  if (!user || !token) {
    return null;
  }

  return (
    <div className="flex h-full bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div>
            <p className="font-bold text-gray-900">{user.username}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        {/* Search Users */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
        </div>

        {/* Conversations and Users List */}
        <div className="flex-1 overflow-y-auto">
          {/* Conversations List */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-700 mb-3">Conversations</h3>
            {conversations.length === 0 ? (
              <p className="text-gray-500 text-sm">No conversations yet</p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedUserId(conv.otherUserId);
                      setSearchQuery("");
                    }}
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

          {/* Users Section */}
          <div className="p-4">
            <h3 className="font-bold text-gray-700 mb-3 text-sm">Users</h3>
            {isLoadingUsers ? (
              <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {users
                  .filter(
                    (u) =>
                      !searchQuery ||
                      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setSearchQuery("");
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-blue-50 border border-gray-200 transition-colors"
                    >
                      <p className="font-semibold text-sm text-gray-900">{u.username}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Logout Button at Bottom */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full px-4 py-3 bg-red-500 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedUserId ? (
          <ConversationView selectedUserId={selectedUserId} />
        ) : (
          <div 
            className="flex-1 flex flex-col items-center justify-center bg-cover bg-center"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23E0F2FE' fill-opacity='0.5'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: '#F0F9FF'
            }}
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Secure Messaging
              </h2>
              <p className="text-gray-600 mb-8">
                Select a conversation or search for a user to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
