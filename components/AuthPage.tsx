"use client";

import React, { useState } from "react";
import { Lock } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=1200&fit=crop')",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Form container */}
      <div className="relative z-10 bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Lock className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">E2EE Chat</h1>
          <p className="text-gray-600">
            End-to-End Encrypted Messaging
          </p>
        </div>

        {isLogin ? (
          <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
}
