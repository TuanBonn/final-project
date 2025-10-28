// src/components/UserAvatar.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// KHÔNG cần createClient ở đây nữa nếu Logout gọi API
// import { createClient } from '@/lib/supabase/client';
import { useRouter } from "next/navigation";
import Link from "next/link";

// Định nghĩa kiểu dữ liệu cho props
interface UserAvatarProps {
  avatarUrl: string | null;
  username: string | null;
  fullName: string | null;
}

export default function UserAvatar({
  avatarUrl,
  username,
  fullName,
}: UserAvatarProps) {
  const router = useRouter();
  // const supabase = createClient(); // Không cần nữa

  // Xử lý đăng xuất bằng cách gọi API
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Đăng xuất thất bại");
      }
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      alert("Lỗi khi đăng xuất.");
    }
  };

  // Tạo tên viết tắt
  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            {/* Dùng || '' để tránh lỗi nếu avatarUrl là null */}
            <AvatarImage
              src={avatarUrl || ""}
              alt={username || "User Avatar"}
            />
            <AvatarFallback>{getInitials(fullName || username)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {fullName || username || "Người dùng"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {username ? `@${username}` : "Chưa có username"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Thêm các link chức năng */}
        <DropdownMenuItem asChild>
          <Link href="/profile">Trang cá nhân</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/sell">Đăng bán</Link>
        </DropdownMenuItem>
        {/* Bạn có thể thêm link đến trang Quản lý Admin ở đây nếu là admin */}
        {/* <DropdownMenuItem asChild>
          <Link href="/admin">Quản lý</Link> 
        </DropdownMenuItem> */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-500 cursor-pointer"
        >
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
