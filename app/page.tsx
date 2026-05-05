"use client";

import { useAuth } from "@/components/AuthContext";
import { AuthPage } from "@/components/AuthPage";
import { MessagingApp } from "@/components/MessagingApp";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center text-gray-800">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      <MessagingApp />
    </div>
  );
}
