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

// Định nghĩa kiểu dữ liệu User (phải khớp với API /me)
interface User {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "dealer" | "admin";
  is_verified: boolean;
}

// Định nghĩa những gì Context sẽ cung cấp
interface UserContextType {
  user: User | null;
  loadingUser: boolean;
  fetchUserData: () => Promise<void>; // Hàm để phát tín hiệu cập nhật
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Tạo Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();

  // Hàm fetch user data (API /api/auth/me)
  const fetchUserData = useCallback(async () => {
    // console.log("UserProvider: Fetching user data...");

    // Set loading lại (tránh nhấp nháy UI nếu đã load xong lần đầu)
    if (!loadingUser) setLoadingUser(true);

    try {
      // Gọi API /me
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      }); // Gửi kèm cookie
      const data = await res.json();
      // console.log("UserProvider: API response status:", res.status);

      if (res.status === 401 || res.status === 404 || !data.user) {
        // Token hết hạn, user không tồn tại, hoặc chưa đăng nhập
        setUser(null);
        // Nếu user đang ở trang Profile, đá về Login (để tránh lỗi)
        if (window.location.pathname.startsWith("/profile")) {
          router.replace("/login?message=Session expired");
        }
        return;
      }

      // Thành công
      setUser(data.user);
      // console.log("UserProvider: User data set successfully.");
    } catch (error) {
      console.error("UserProvider: Error fetching user data:", error);
      setUser(null);
    } finally {
      setLoadingUser(false); // Kết thúc load
    }
  }, [loadingUser, router]); // Dependency: router để gọi replace

  // Fetch user data lần đầu khi Provider mount
  useEffect(() => {
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy 1 lần khi mount

  // Giá trị cung cấp
  const value = { user, loadingUser, fetchUserData };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Custom hook để sử dụng Context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
