import { User } from "./types";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "users.json");

/**
 * Ensure data directory and file exist
 */
export function ensureDataFile() {
  const dataDir = path.join(process.cwd(), "data");
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

/**
 * Read all users from data file
 */
export function readUsers(): User[] {
  ensureDataFile();
  
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading users:", error);
    return [];
  }
}

/**
 * Save users to data file
 */
export function saveUsers(users: User[]) {
  ensureDataFile();
  
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving users:", error);
    throw error;
  }
}

/**
 * Check if a file from a specific repository has already been indexed
 */
export function isFileIndexed(filePath: string, repo: string): boolean {
  const existingUsers = readUsers();
  
  return existingUsers.some(
    (user) => user.filePath === filePath && user.repo === repo
  );
}

/**
 * Add new users to the data file
 */
export function addUsers(newUsers: User[]) {
  const existingUsers = readUsers();
  
  // Filter out duplicates (same username and repo)
  const filteredNewUsers = newUsers.filter(
    (newUser) =>
      !existingUsers.some(
        (existing) =>
          existing.username === newUser.username &&
          existing.repo === newUser.repo
      )
  );
  
  const updatedUsers = [...filteredNewUsers, ...existingUsers];
  saveUsers(updatedUsers);
  
  return updatedUsers;
}
