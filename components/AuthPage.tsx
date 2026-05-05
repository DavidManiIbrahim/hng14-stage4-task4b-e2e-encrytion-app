"use client";

import React, { useState } from "react";
import { Lock } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center relative"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=1200&fit=crop')",
      }}
    >
      {/* Dark overlay with blur effect */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

      {/* Form container with glass effect */}
      <div className="relative z-10 bg-white/30 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full border border-white/20 hover:shadow-lg transition-shadow">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full text-white shadow-lg ">
              <img
                src="/e2e.png"
                alt="E2EE Chat logo"
                className="w-40 h-40 object-contain"
              />
            </div>
          </div>
          {/* <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">E2EE Chat</h1> */}
          <p className="text-white/80 drop-shadow-md">
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
