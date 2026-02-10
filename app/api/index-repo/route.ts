import { NextRequest, NextResponse } from "next/server";
import { fetchAndParseTDFile } from "@/lib/github";
import { addUsers, isFileIndexed, readUsers } from "@/lib/storage";

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

    // First, fetch and parse the .td file to get the source (repo)
    const { users: parsedUsers, source } = await fetchAndParseTDFile(fileUrl);

    // Check if this file from this repo has already been indexed
    if (isFileIndexed(fileUrl, source)) {
      return NextResponse.json(
        { 
          error: "This file has already been indexed from this repository",
          alreadyIndexed: true
        },
        { status: 409 } // 409 Conflict
      );
    }

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

export async function GET(request: NextRequest) {
  try {
    const { readUsers } = await import("@/lib/storage");
    const users = readUsers();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const usernameFilter = searchParams.get('username');
    const repoFilter = searchParams.get('repo');
    const statusFilter = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    // Filter users based on query parameters
    let filteredUsers = users;
    
    // If both username and repo filters are the same, it's a search query (OR logic)
    if (usernameFilter && repoFilter && usernameFilter === repoFilter) {
      const searchTerm = usernameFilter.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        user.repo.toLowerCase().includes(searchTerm)
      );
    } else {
      // Otherwise, apply filters separately (AND logic)
      if (usernameFilter) {
        filteredUsers = filteredUsers.filter(user => 
          user.username.toLowerCase().includes(usernameFilter.toLowerCase())
        );
      }
      
      if (repoFilter && repoFilter !== usernameFilter) {
        filteredUsers = filteredUsers.filter(user => 
          user.repo.toLowerCase().includes(repoFilter.toLowerCase())
        );
      }
    }

    if (statusFilter && statusFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => 
        user.status === statusFilter
      );
    }
    
    // Calculate pagination
    const totalCount = filteredUsers.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Calculate status counts from all users (not filtered)
    const vouchCount = users.filter(u => u.status === 'vouch').length;
    const denouncedCount = users.filter(u => u.status === 'denounced').length;
    
    return NextResponse.json({
      success: true,
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      counts: {
        vouch: vouchCount,
        denounced: denouncedCount,
        total: users.length,
      },
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
