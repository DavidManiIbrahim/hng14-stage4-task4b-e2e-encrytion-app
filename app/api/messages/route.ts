import { NextRequest, NextResponse } from "next/server";
import {
  getUserFromToken,
  getMessagesBetween,
  getMessagesForUser,
} from "@/lib/db";

// Get all messages for the current user or between two users
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const otherUserId = request.nextUrl.searchParams.get("otherUserId");

    let messages = [];
    if (otherUserId) {
      messages = getMessagesBetween(user.id, otherUserId);
    } else {
      messages = getMessagesForUser(user.id);
    }

    return NextResponse.json({
      messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
