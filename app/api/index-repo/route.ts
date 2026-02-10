import { NextRequest, NextResponse } from "next/server";
import { fetchAndParseTDFile } from "@/lib/github";
import { addUsers } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { error: "File URL is required" },
        { status: 400 }
      );
    }

    // Fetch and parse the .td file
    const { users: parsedUsers, source } = await fetchAndParseTDFile(fileUrl);

    // Convert to User format
    const users = parsedUsers.map((user) => ({
      username: user.username,
      status: user.status,
      repo: source,
      filePath: fileUrl,
      addedAt: new Date().toISOString(),
      platform: user.platform,
    }));

    // Save to storage
    const allUsers = addUsers(users);

    return NextResponse.json({
      success: true,
      users: allUsers,
      newCount: users.length,
    });
  } catch (error) {
    console.error("Error indexing file:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to index file",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { readUsers } = await import("@/lib/storage");
    const users = readUsers();
    
    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error) {
    console.error("Error reading users:", error);
    return NextResponse.json(
      {
        error: "Failed to read users",
      },
      { status: 500 }
    );
  }
}
