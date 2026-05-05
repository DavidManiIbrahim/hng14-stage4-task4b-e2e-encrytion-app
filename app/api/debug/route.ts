import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/db";

export async function GET() {
  try {
    const allUsers = getAllUsers();
    return NextResponse.json({
      message: "Debug info",
      userCount: allUsers.length,
      users: allUsers.map((u) => ({ id: u.id, username: u.username, email: u.email })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Debug error", details: String(error) },
      { status: 500 }
    );
  }
}
