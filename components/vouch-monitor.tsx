"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface User {
  username: string;
  status: "vouch" | "denounced";
  repo: string;
  filePath: string;
  addedAt: string;
  platform?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const mockUsers: User[] = [
  {
    username: "john_doe",
    status: "vouch",
    repo: "acme/project-alpha",
    filePath: "contributors/john_doe.td",
    addedAt: "2 hours ago",
    platform: "github",
  },
  {
    username: "ai_bot_2024",
    status: "denounced",
    repo: "acme/project-alpha",
    filePath: "users/ai_bot_2024.td",
    addedAt: "5 hours ago",
  },
  {
    username: "sarah_smith",
    status: "vouch",
    repo: "opensource/toolkit",
    filePath: "members/sarah_smith.td",
    addedAt: "1 day ago",
  },
  {
    username: "bot_master",
    status: "denounced",
    repo: "opensource/toolkit",
    filePath: "accounts/bot_master.td",
    addedAt: "2 days ago",
    platform: "github",
  },
  {
    username: "dev_contributor",
    status: "vouch",
    repo: "community/hub",
    filePath: "devs/dev_contributor.td",
    addedAt: "3 days ago",
  },
];

export function VouchMonitor() {
  const [repoUrl, setRepoUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "vouch" | "denounced">("all");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogUrl, setDialogUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [counts, setCounts] = useState({ vouch: 0, denounced: 0, total: 0 });

  const fetchUsers = async (page: number = 1, status: string = filterStatus, search: string = searchQuery) => {
    try {
      const statusParam = status === 'all' ? '' : `&status=${status}`;
      const searchParam = search.trim() ? `&username=${encodeURIComponent(search)}&repo=${encodeURIComponent(search)}` : '';
      const response = await fetch(`/api/index-repo?page=${page}&limit=10${statusParam}${searchParam}`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
        setCounts(data.counts);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Load users on mount
  useEffect(() => {
    fetchUsers(currentPage);
  }, []);

  // Fetch users when filter changes
  useEffect(() => {
    if (!isLoading) {
      setCurrentPage(1); // Reset to page 1 when filter changes
      fetchUsers(1, filterStatus, searchQuery);
    }
  }, [filterStatus]);

  // Debounced search - fetch users when search query changes
  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1); // Reset to page 1 when searching
        fetchUsers(1, filterStatus, searchQuery);
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  const validateGitHubUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError("URL is required");
      return false;
    }

    // Check if it's a GitHub URL
    const isGitHubUrl = url.includes('github.com') || url.includes('raw.githubusercontent.com');
    if (!isGitHubUrl) {
      setUrlError("Only GitHub URLs are allowed");
      return false;
    }

    // Check if it ends with .td extension
    const hasTdExtension = url.toLowerCase().endsWith('.td');
    if (!hasTdExtension) {
      setUrlError("URL must point to a .td file");
      return false;
    }

    setUrlError("");
    return true;
  };

  const handleIndexRepo = async (urlToIndex?: string) => {
    const url = urlToIndex || repoUrl;
    
    // Validate the URL
    if (!validateGitHubUrl(url)) {
      return;
    }
    
    setIsIndexing(true);
    setIsTyping(false);
    setIsDialogOpen(false);
    setUrlError(""); // Clear any previous errors
    
    try {
      const response = await fetch("/api/index-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrl: url }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh the user list with current pagination and filter
        await fetchUsers(1, filterStatus, searchQuery); // Go to first page after indexing
        alert(`Successfully indexed ${data.newCount} new users!`);
        setRepoUrl("");
        setDialogUrl("");
      } else {
        // Handle specific error cases
        if (data.alreadyIndexed) {
          alert(`⚠️ Already Indexed\n\nThis file has already been indexed from this repository.\n\nFile: ${url}`);
        } else {
          alert(`Error: ${data.error || "Failed to index file"}`);
        }
      }
    } catch (error) {
      console.error("Error indexing file:", error);
      alert("Failed to index file. Please check the URL and try again.");
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f0f4f3] flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-[#f0f4f3]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-black text-white font-bold text-xs sm:text-sm">
                V
              </div>
              <span className="font-semibold text-base sm:text-lg whitespace-nowrap">Vouch Monitor</span>
            </div>
            <nav className="flex items-center gap-3 sm:gap-6">
              <a 
                href="https://github.com/onurkanbakirci/vouch-monitor" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 cursor-pointer underline"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                <span className="hidden sm:inline">Github</span>
              </a>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 h-9 sm:h-10 px-3 sm:px-4 cursor-pointer text-xs sm:text-sm">
                    <svg className="h-4 w-4 sm:mr-2" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"/>
                    </svg>
                    <span className="hidden sm:inline">Index Vouch</span>
                    <span className="sm:hidden">Index</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-[525px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Index Vouch</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                      Enter the URL of a .td file from GitHub. Both regular and raw URLs are supported.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Input
                        placeholder="https://github.com/user/repo/blob/main/VOUCHED.td"
                        value={dialogUrl}
                        onChange={(e) => {
                          setDialogUrl(e.target.value);
                          setUrlError(""); // Clear error on change
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && dialogUrl.trim()) {
                            handleIndexRepo(dialogUrl);
                          }
                        }}
                        className={`h-11 text-sm ${urlError ? 'border-red-500 focus:border-red-500' : ''}`}
                        autoFocus
                      />
                      {urlError && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM7 4a1 1 0 012 0v4a1 1 0 01-2 0V4zm1 8a1 1 0 100-2 1 1 0 000 2z"/>
                          </svg>
                          {urlError}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Tip: Only GitHub URLs with .td file extensions are accepted
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setUrlError("");
                        setDialogUrl("");
                      }}
                      className="cursor-pointer text-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleIndexRepo(dialogUrl)}
                      disabled={!dialogUrl.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Index
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-8 flex-1 min-h-[400px] sm:min-h-[600px]">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-teal-700 mb-1">
            Vouch Monitor
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
            GitHub User Trust System
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm mb-4 sm:mb-6">
            Scan repositories for .td files to identify vouched and denounced users
          </p>

          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="Search by username or repo..."
              className="h-10 sm:h-11 bg-white text-sm rounded-lg border-gray-300 w-full"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsTyping(true);
              }}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 sm:mb-6 border-b overflow-x-auto">
          <div className="flex gap-4 sm:gap-8 min-w-max">
            <button
              onClick={() => setFilterStatus("all")}
              className={`pb-2 sm:pb-3 px-1 border-b-2 transition-colors text-sm sm:text-base cursor-pointer whitespace-nowrap ${
                filterStatus === "all"
                  ? "border-teal-600 text-gray-900 font-medium"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                </svg>
                Popular
              </span>
            </button>
            <button
              onClick={() => setFilterStatus("vouch")}
              className={`pb-2 sm:pb-3 px-1 border-b-2 transition-colors text-sm sm:text-base cursor-pointer whitespace-nowrap ${
                filterStatus === "vouch"
                  ? "border-teal-600 text-gray-900 font-medium"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                </svg>
                Vouched
              </span>
            </button>
            <button
              onClick={() => setFilterStatus("denounced")}
              className={`pb-2 sm:pb-3 px-1 border-b-2 transition-colors text-sm sm:text-base cursor-pointer whitespace-nowrap ${
                filterStatus === "denounced"
                  ? "border-teal-600 text-gray-900 font-medium"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.47.22A.75.75 0 015 0h6a.75.75 0 01.53.22l4.25 4.25c.141.14.22.331.22.53v6a.75.75 0 01-.22.53l-4.25 4.25A.75.75 0 0111 16H5a.75.75 0 01-.53-.22L.22 11.53A.75.75 0 010 11V5a.75.75 0 01.22-.53L4.47.22zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5H5.31zM8 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 100-2 1 1 0 000 2z"/>
                </svg>
                Denounced
              </span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border min-h-[300px] sm:min-h-[400px] w-full overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b bg-gray-50">
                <TableHead className="font-semibold text-gray-600 uppercase text-xs min-w-[120px] sm:w-[200px]">Username</TableHead>
                <TableHead className="font-semibold text-gray-600 uppercase text-xs min-w-[100px] sm:w-[150px]">Status</TableHead>
                <TableHead className="font-semibold text-gray-600 uppercase text-xs min-w-[150px] sm:w-[200px] hidden sm:table-cell">Repository</TableHead>
                <TableHead className="font-semibold text-gray-600 uppercase text-xs min-w-[180px] sm:w-[250px] hidden md:table-cell">File Path</TableHead>
                <TableHead className="font-semibold text-gray-600 uppercase text-xs text-right min-w-[100px] sm:w-[150px]">Discovered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isIndexing || isTyping || isLoading ? (
                // Skeleton Loading State
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24 sm:w-32"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20 sm:w-24"></div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32 sm:w-40"></div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-36 sm:w-48"></div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16 sm:w-20 ml-auto"></div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 sm:py-12 text-gray-500 text-xs sm:text-sm">
                    No users found. Index a .td file to get started.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user, index) => (
                  <TableRow 
                    key={index} 
                    className="hover:bg-gray-50"
                  >
                    <TableCell 
                      className="font-medium text-teal-600 cursor-pointer hover:underline text-xs sm:text-sm"
                      onClick={() => window.open(`https://github.com/${user.username}`, '_blank')}
                    >
                      {user.username}
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => window.open(`https://github.com/${user.username}`, '_blank')}
                    >
                      {user.status === "vouch" ? (
                        <span className="text-green-600 text-xs sm:text-sm inline-flex items-center gap-1">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                          </svg>
                          <span className="hidden xs:inline">Vouched</span>
                          <span className="xs:hidden">✓</span>
                        </span>
                      ) : (
                        <span className="text-red-600 text-xs sm:text-sm inline-flex items-center gap-1">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4.47.22A.75.75 0 015 0h6a.75.75 0 01.53.22l4.25 4.25c.141.14.22.331.22.53v6a.75.75 0 01-.22.53l-4.25 4.25A.75.75 0 0111 16H5a.75.75 0 01-.53-.22L.22 11.53A.75.75 0 010 11V5a.75.75 0 01.22-.53L4.47.22zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5H5.31zM8 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 100-2 1 1 0 000 2z"/>
                          </svg>
                          <span className="hidden xs:inline">Denounced</span>
                          <span className="xs:hidden">✗</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell 
                      className="text-gray-600 cursor-pointer hover:underline text-xs sm:text-sm hidden sm:table-cell"
                      onClick={() => window.open(`https://github.com/${user.repo}`, '_blank')}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                        </svg>
                        <span className="truncate">{user.repo}</span>
                      </div>
                    </TableCell>
                    <TableCell 
                      className="text-gray-600 text-xs sm:text-sm max-w-[150px] sm:max-w-[200px] hidden md:table-cell"
                      onClick={() => window.open(user.filePath, '_blank')}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="truncate hover:underline cursor-pointer">
                            {user.filePath}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs break-all">{user.filePath}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell 
                      className="text-gray-600 text-xs sm:text-sm text-right cursor-pointer whitespace-nowrap"
                      onClick={() => window.open(`https://github.com/${user.username}`, '_blank')}
                    >
                      {new Date(user.addedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: window.innerWidth < 640 ? undefined : 'numeric'
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {!isIndexing && !isTyping && !isLoading && users.length > 0 && (
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
              Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} users
            </div>
            <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center">
              <Button
                variant="outline"
                onClick={() => fetchUsers(currentPage - 1, filterStatus, searchQuery)}
                disabled={!pagination.hasPreviousPage}
                className="cursor-pointer disabled:cursor-not-allowed h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm"
              >
                <svg className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M11.78 12.53a.75.75 0 01-1.06 0L6.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L8.06 7.75l3.72 3.72a.75.75 0 010 1.06z"/>
                </svg>
                <span className="hidden sm:inline">Previous</span>
              </Button>
              
              <div className="flex items-center gap-0.5 sm:gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first page, last page, current page, and pages around current
                    // On mobile, show fewer pages
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                    if (isMobile) {
                      return (
                        page === 1 ||
                        page === pagination.totalPages ||
                        page === currentPage
                      );
                    }
                    return (
                      page === 1 ||
                      page === pagination.totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    );
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                    
                    return (
                      <div key={page} className="flex items-center gap-0.5 sm:gap-1">
                        {showEllipsisBefore && (
                          <span className="px-1 sm:px-2 text-gray-500 text-xs sm:text-sm">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          onClick={() => fetchUsers(page, filterStatus, searchQuery)}
                          className={`w-8 h-8 sm:w-10 sm:h-10 cursor-pointer text-xs sm:text-sm p-0 ${
                            currentPage === page
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : ""
                          }`}
                        >
                          {page}
                        </Button>
                      </div>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                onClick={() => fetchUsers(currentPage + 1, filterStatus, searchQuery)}
                disabled={!pagination.hasNextPage}
                className="cursor-pointer disabled:cursor-not-allowed h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <svg className="h-3 w-3 sm:h-4 sm:w-4 sm:ml-1" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M4.22 3.47a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L7.94 8.25 4.22 4.53a.75.75 0 010-1.06z"/>
                </svg>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-xs sm:text-sm text-gray-600 gap-2 sm:gap-0">
            <div className="text-center sm:text-left">
              © 2026, Vouch Monitor
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-center">
              <span>Built by</span>
              <a
                href="https://github.com/onurkanbakirci"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 hover:text-teal-600 underline cursor-pointer inline-flex items-center gap-1"
              >
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                onurkanbakirci
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </TooltipProvider>
  );
}
