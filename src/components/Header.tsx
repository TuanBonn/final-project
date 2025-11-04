// src/components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, ShoppingCart, ShieldCheck, Loader2 } from "lucide-react";
import UserAvatar from "./UserAvatar";
import { useUser } from "@/contexts/UserContext"; // Dùng Context
// Bỏ usePathname đi, không cần check trang admin nữa
// import { usePathname } from 'next/navigation';

export default function Header() {
  const { user, loadingUser } = useUser();
  // const pathname = usePathname(); // BỎ
  // const isAdminPage = pathname.startsWith('/admin'); // BỎ

  const logoSrc =
    "https://xiuswadifrrbocuiiygs.supabase.co/storage/v1/object/public/public-assets/logo1.png"; // Sửa lại link logo nếu cần

  // --- RENDER HEADER ---
  if (loadingUser) {
    return (
      // Header loading (giữ nguyên)
      <header className="w-full border-b sticky top-0 bg-white shadow-sm z-50">
        <div className="container mx-auto flex h-16 items-center justify-end pr-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </header>
    );
  }

  // BỎ LOGIC IF (isAdminPage)
  // Chỉ render 1 kiểu Header duy nhất
  return (
    <header className="w-full border-b sticky top-0 bg-white shadow-sm z-50">
      <div className="container mx-auto flex h-16 items-center">
        {/* Logo (Luôn hiển thị) */}
        <div className="mr-8 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image src={logoSrc} alt="Logo" width={140} height={40} priority />
          </Link>
        </div>

        {/* Search Bar (Luôn hiển thị) */}
        <div className="flex-1 max-w-xl relative mx-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm..."
            className="w-full pl-10"
          />
        </div>

        {/* Nav & Icons (Phần "Biến hình" ở đây) */}
        <nav className="ml-auto flex items-center gap-2 md:gap-4">
          {/* === LUÔN HIỂN THỊ LINK USER === */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/shop">Shop</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/forum">Forum</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/service">Service</Link>
          </Button>
          {/* ============================== */}

          <div className="h-6 w-px bg-border hidden md:block" />

          {/* === CHỈ ADMIN MỚI THẤY NÚT NÀY === */}
          {user?.role === "admin" && (
            <Button variant="ghost" size="sm" asChild>
              <Link
                href="/admin"
                className="text-red-600 font-bold hover:text-red-700"
              >
                <ShieldCheck className="h-4 w-4 mr-1" />
                Admin Panel
              </Link>
            </Button>
          )}
          {/* ================================== */}

          {/* Avatar / Nút Login (Dùng chung cho tất cả) */}
          {user ? (
            <UserAvatar
              avatarUrl={user.avatar_url}
              username={user.username}
              fullName={user.full_name}
            />
          ) : (
            <Button variant="ghost" size="icon" asChild>
              <Link href="/login">
                <User className="h-5 w-5" />
              </Link>
            </Button>
          )}

          {/* Giỏ hàng (Dùng chung cho tất cả) */}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
