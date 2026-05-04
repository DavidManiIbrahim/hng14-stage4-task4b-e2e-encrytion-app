"use client";

import React, { useState } from "react";
import * as types from "@/lib/types";

interface UserListProps {
  users: types.User[];
  isLoading: boolean;
  onSelectUser: (userId: string) => void;
}

export function UserList({ users, isLoading, onSelectUser }: UserListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full">
      <input
        type="text"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
      />

      {isLoading ? (
        <div className="text-center py-4 text-gray-500">Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          {searchQuery ? "No users found" : "No users available"}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user.id)}
              className="w-full text-left p-3 hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors"
            >
              <p className="font-semibold text-gray-900">{user.username}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
