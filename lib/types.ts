export interface User {
  username: string;
  status: "vouch" | "denounced";
  repo: string;
  filePath: string;
  addedAt: string;
  platform?: string;
}

export interface TDFile {
  path: string;
  content: string;
  username?: string;
  status?: "vouch" | "denounced";
}

export interface Repository {
  owner: string;
  name: string;
  url: string;
  lastIndexed?: Date;
}