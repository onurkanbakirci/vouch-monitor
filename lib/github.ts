import { User, TDFile, Repository } from "./types";

/**
 * Parse GitHub repository URL to extract owner and repo name
 */
export function parseGitHubUrl(url: string): Repository | null {
  try {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)/,
      /github\.com\/([^\/]+)\/([^\/]+)\.git/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const [, owner, name] = match;
        return {
          owner,
          name: name.replace(/\.git$/, ""),
          url,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error parsing GitHub URL:", error);
    return null;
  }
}

/**
 * Fetch repository contents from GitHub API
 */
export async function fetchRepositoryContents(
  owner: string,
  repo: string,
  path: string = ""
): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          // Add GitHub token here if needed for higher rate limits
          // Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching repository contents:", error);
    return [];
  }
}

/**
 * Recursively search for .td files in repository
 */
export async function searchTDFiles(
  owner: string,
  repo: string,
  path: string = ""
): Promise<TDFile[]> {
  const tdFiles: TDFile[] = [];
  
  try {
    const contents = await fetchRepositoryContents(owner, repo, path);

    for (const item of contents) {
      if (item.type === "file" && item.name.endsWith(".td")) {
        // Fetch file content
        const fileContent = await fetchFileContent(item.download_url);
        tdFiles.push({
          path: item.path,
          content: fileContent,
        });
      } else if (item.type === "dir") {
        // Recursively search directories
        const nestedFiles = await searchTDFiles(owner, repo, item.path);
        tdFiles.push(...nestedFiles);
      }
    }
  } catch (error) {
    console.error("Error searching for .td files:", error);
  }

  return tdFiles;
}

/**
 * Fetch file content from URL
 */
async function fetchFileContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    return await response.text();
  } catch (error) {
    console.error("Error fetching file content:", error);
    return "";
  }
}

/**
 * Parse .td file to extract usernames and statuses
 * 
 * Format:
 * - Lines starting with # are comments
 * - One handle per line (without @)
 * - Optional platform prefix: platform:username (e.g., github:user)
 * - Denounce with minus prefix: -username or -platform:username
 * - Vouched users have no prefix
 */
export function parseTDFile(content: string): Array<{
  username: string;
  status: "vouch" | "denounced";
  platform?: string;
}> {
  const users: Array<{
    username: string;
    status: "vouch" | "denounced";
    platform?: string;
  }> = [];

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    let username = trimmed;
    let status: "vouch" | "denounced" = "vouch";
    let platform: string | undefined;

    // Check if denounced (starts with -)
    if (username.startsWith('-')) {
      status = "denounced";
      username = username.substring(1); // Remove the minus
    }

    // Extract optional details after space (ignore them for now)
    const spaceIndex = username.indexOf(' ');
    if (spaceIndex > 0) {
      username = username.substring(0, spaceIndex);
    }

    // Check for platform prefix (e.g., github:username)
    const colonIndex = username.indexOf(':');
    if (colonIndex > 0) {
      platform = username.substring(0, colonIndex);
      username = username.substring(colonIndex + 1);
    }

    // Only add if we have a valid username
    if (username) {
      users.push({
        username,
        status,
        platform,
      });
    }
  }

  return users;
}

/**
 * Convert GitHub URL to raw content URL
 */
function convertToRawUrl(url: string): string {
  // If already a raw URL, return as is
  if (url.includes('raw.githubusercontent.com')) {
    return url;
  }
  
  // Convert github.com/user/repo/blob/branch/file to raw URL
  if (url.includes('github.com')) {
    return url
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
  }
  
  return url;
}

/**
 * Fetch and parse a .td file from a direct URL
 */
export async function fetchAndParseTDFile(url: string): Promise<{
  users: Array<{
    username: string;
    status: "vouch" | "denounced";
    platform?: string;
  }>;
  source: string;
}> {
  try {
    // Convert to raw URL if needed
    const rawUrl = convertToRawUrl(url);
    
    // Fetch the .td file content
    const response = await fetch(rawUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const content = await response.text();
    
    // Check if we got HTML instead of raw content
    if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) {
      throw new Error('Received HTML instead of raw file content. Please use a raw GitHub URL or ensure the file is directly accessible.');
    }
    
    // Parse the content
    const users = parseTDFile(content);
    
    if (users.length === 0) {
      throw new Error('No users found in the .td file. Please check the file format.');
    }
    
    // Extract repo info from URL (for GitHub raw URLs)
    let source = url;
    const githubMatch = url.match(/github(?:usercontent)?\.com\/([^\/]+)\/([^\/]+)/);
    if (githubMatch) {
      source = `${githubMatch[1]}/${githubMatch[2]}`;
    }
    
    return {
      users,
      source,
    };
  } catch (error) {
    console.error("Error fetching .td file:", error);
    throw error;
  }
}

/**
 * Index a GitHub repository and extract users from .td files
 */
export async function indexRepository(repoUrl: string): Promise<User[]> {
  const allUsers: User[] = [];

  // Parse repository URL
  const repo = parseGitHubUrl(repoUrl);
  if (!repo) {
    throw new Error("Invalid GitHub repository URL");
  }

  // Search for .td files
  const tdFiles = await searchTDFiles(repo.owner, repo.name);

  // Parse each .td file
  for (const file of tdFiles) {
    const parsedUsers = parseTDFile(file.content);
    
    for (const user of parsedUsers) {
      allUsers.push({
        username: user.username,
        status: user.status,
        repo: `${repo.owner}/${repo.name}`,
        filePath: file.path,
        addedAt: new Date().toISOString(),
        platform: user.platform,
      });
    }
  }

  return allUsers;
}
