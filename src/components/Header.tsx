// src/components/Header.tsx

import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, ShoppingCart, ShieldCheck } from "lucide-react"; // Thêm icon Admin
import UserAvatar from "./UserAvatar"; // Component Client
import { cookies } from "next/headers";

// Định nghĩa kiểu User (phải khớp với API /api/auth/me)
interface User {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "dealer" | "admin"; // Định nghĩa rõ các role
  is_verified: boolean;
}

// Hàm fetch user data
async function getUserData(): Promise<{ user: User | null }> {
  try {
    const cookieStore = cookies();
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/auth/me`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: "no-store",
      }
    );
    if (!res.ok) return { user: null };
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Header: Error fetching /api/auth/me:", error);
    return { user: null };
  }
}

// Header là Async Server Component
export default async function Header() {
  const { user } = await getUserData();

  // === RENDER HEADER DỰA TRÊN ROLE ===
  if (user?.role === "admin") {
    // --- GIAO DIỆN HEADER CHO ADMIN ---
    return (
      <header className="w-full border-b sticky top-0 bg-red-100 shadow-sm z-50">
        {" "}
        {/* Màu khác biệt */}
        <div className="container mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-red-700" />
            <Link href="/admin" className="font-bold text-lg text-red-700">
              ADMIN DASHBOARD
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            {/* Các link quản lý */}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/users">Users</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/products">Products</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/transactions">Transactions</Link>
            </Button>
            {/* Hiển thị avatar admin và logout */}
            {user && (
              <UserAvatar
                avatarUrl={user.avatar_url}
                username={user.username}
                fullName={user.full_name}
              />
            )}
          </nav>
        </div>
      </header>
    );
  } else {
    // --- GIAO DIỆN HEADER CHO USER/DEALER/KHÁCH ---
    return (
      <header className="w-full border-b sticky top-0 bg-white shadow-sm z-50">
        <div className="container mx-auto flex h-16 items-center">
          {/* Logo */}
          <div className="mr-8">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="https://xiuswadifrrbocuiiygs.supabase.co/storage/v1/object/public/public-assets/logo.png"
                alt="Logo Cửa Hàng"
                width={140}
                height={40}
                priority
              />
            </Link>
          </div>
          {/* Search Bar */}
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm..."
              className="w-full pl-10"
            />
          </div>
          {/* Nav & Icons */}
          <nav className="ml-auto flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/shop">Shop</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/forum">Forum</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/service">Service</Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            {user ? (
              // Nếu đã đăng nhập (user/dealer), hiển thị Avatar
              <UserAvatar
                avatarUrl={user.avatar_url}
                username={user.username}
                fullName={user.full_name}
              />
            ) : (
              // Nếu chưa đăng nhập, hiển thị Icon Login
              <Button variant="ghost" size="icon" asChild>
                <Link href="/login">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            )}
            {/* Icon Giỏ hàng (Tạm thời chưa có chức năng) */}
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
}
