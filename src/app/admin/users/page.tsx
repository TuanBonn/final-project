// src/app/admin/users/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Search } from "lucide-react";
import { UserActions } from "@/components/admin/UserActions";
import { Input } from "@/components/ui/input";

// Define User Type
interface User {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: "user" | "dealer" | "admin";
  is_verified: boolean;
  status: "active" | "banned";
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // === FETCH FUNCTION ===
  const fetchUsers = useCallback(
    async (searchQuery: string, isInitialLoad: boolean = false) => {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsSearching(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchQuery) {
          params.append("search", searchQuery);
        }

        const response = await fetch(`/api/admin/users?${params.toString()}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        setUsers(data.users || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error.");
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    },
    []
  );

  // 1. Initial Load
  useEffect(() => {
    fetchUsers("", true);
  }, [fetchUsers]);

  // 2. Debounced Search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(searchTerm, false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchTerm, fetchUsers]);

  // --- Render UI ---
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <AlertCircle className="h-8 w-8 text-destructive mr-3" />
        <p className="text-destructive font-medium">
          Error loading users: {error}
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>User Management ({users.length})</CardTitle>
            <CardDescription>
              View, edit, and manage user accounts.
            </CardDescription>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, username..."
              className="pl-9 w-full bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div>{user.full_name || "Unnamed"}</div>
                      <div className="text-xs text-muted-foreground">
                        @{user.username || "..."}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">
                      <Badge
                        variant={
                          user.role === "admin" ? "destructive" : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_verified ? (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === "active" ? "default" : "outline"
                        }
                        className={
                          user.status === "banned"
                            ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
                            : ""
                        }
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActions
                        user={{
                          id: user.id,
                          username: user.username,
                          status: user.status,
                          role: user.role,
                          is_verified: user.is_verified,
                        }}
                        onActionSuccess={() => fetchUsers(searchTerm, false)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
