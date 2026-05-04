import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, storeMessage } from "@/lib/db";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      recipientId,
      encryptedSymmetricKey,
      encryptedContent,
      encryptedContentIv,
    } = body;

    if (
      !recipientId ||
      !encryptedSymmetricKey ||
      !encryptedContent ||
      !encryptedContentIv
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const message = storeMessage(
      user.id,
      recipientId,
      encryptedSymmetricKey,
      encryptedContent,
      encryptedContentIv
    );

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
