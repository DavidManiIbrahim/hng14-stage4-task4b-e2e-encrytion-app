"use client";

import React, { useState } from "react";
import { Mail, Lock, UserPlus } from "lucide-react";
import { useAuth } from "./AuthContext";
import { generateKeyPair } from "@/lib/crypto";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      // Generate RSA key pair
      const { publicKey } = await generateKeyPair();

      // Register with public key
      await register(username, email, password, publicKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <h2 className="text-2xl font-bold mb-6 text-white drop-shadow-lg">Register</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-500/30 border border-red-300/50 text-white rounded-lg backdrop-blur-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-white/90 text-sm font-bold mb-2 drop-shadow-md">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent disabled:opacity-50 transition-all"
          placeholder="Choose a username"
          disabled={isLoading}
        />
      </div>

      <div className="mb-4">
        <label className="block text-white/90 text-sm font-bold mb-2 flex items-center gap-2 drop-shadow-md">
          <Mail className="w-4 h-4" />
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent disabled:opacity-50 transition-all"
          placeholder="Enter your email"
          disabled={isLoading}
        />
      </div>

      <div className="mb-4">
        <label className="block text-white/90 text-sm font-bold mb-2 flex items-center gap-2 drop-shadow-md">
          <Lock className="w-4 h-4" />
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent disabled:opacity-50 transition-all"
          placeholder="Enter a password"
          disabled={isLoading}
        />
      </div>

      <div className="mb-6">
        <label className="block text-white/90 text-sm font-bold mb-2 flex items-center gap-2 drop-shadow-md">
          <Lock className="w-4 h-4" />
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent disabled:opacity-50 transition-all"
          placeholder="Confirm your password"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all border border-blue-400/50 shadow-lg"
      >
        <UserPlus className="w-4 h-4" />
        {isLoading ? "Registering..." : "Register"}
      </button>

      <p className="mt-4 text-center text-white/80 text-sm drop-shadow-md">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-white font-bold hover:text-blue-200 transition-colors"
        >
          Login
        </button>
      </p>
    </form>
  );
}
