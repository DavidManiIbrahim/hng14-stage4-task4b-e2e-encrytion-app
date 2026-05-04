import { NextRequest, NextResponse } from "next/server";
import {
  getUserFromToken,
  getAllUsers,
  searchUsersByQuery,
} from "@/lib/db";

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

    const query = request.nextUrl.searchParams.get("q");
    let users = [];

    if (query) {
      users = searchUsersByQuery(query);
    } else {
      users = getAllUsers();
    }

    // Filter out the current user
    users = users.filter((u) => u.id !== user.id);

    return NextResponse.json({
      users,
    });
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
