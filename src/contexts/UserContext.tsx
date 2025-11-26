// src/contexts/UserContext.tsx
"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

// Định nghĩa kiểu dữ liệu User
interface User {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "dealer" | "admin";
  is_verified: boolean;
  balance: number;
  reputation_score: number; // Thêm trường này
  // Các trường bổ sung (Cho phép any hoặc define kỹ)
  shipping_info?: any;
  bank_info?: any;
}

interface UserContextType {
  user: User | null;
  loadingUser: boolean;
  fetchUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();

  const fetchUserData = useCallback(async () => {
    // Không set loadingUser=true ở đây để tránh nhấp nháy giao diện khi update ngầm
    try {
      const res = await fetch("/api/profile/me", {
        // Dùng API profile để lấy full info
        cache: "no-store",
        credentials: "include",
      });

      if (res.status === 401) {
        setUser(null);
        return;
      }

      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("UserProvider: Error fetching user data:", error);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const value = { user, loadingUser, fetchUserData };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
