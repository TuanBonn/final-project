// src/components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  User,
  ShoppingCart,
  ShieldCheck,
  Loader2,
  Gavel,
} from "lucide-react"; // <-- THÊM GAVEL
import UserAvatar from "./UserAvatar";
import { useUser } from "@/contexts/UserContext";

export default function Header() {
  const { user, loadingUser } = useUser();
  const logoSrc =
    "https://xiuswadifrrbocuiiygs.supabase.co/storage/v1/object/public/public-assets/logo1.png";

  if (loadingUser) {
    return (
      <header className="w-full border-b sticky top-0 bg-white shadow-sm z-50">
        <div className="container mx-auto flex h-16 items-center justify-end pr-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </header>
    );
  }

  return (
    <header className="w-full border-b sticky top-0 bg-white shadow-sm z-50">
      <div className="container mx-auto flex h-16 items-center">
        {/* Logo */}
        <div className="mr-8 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image src={logoSrc} alt="Logo" width={140} height={40} priority />
          </Link>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl relative mx-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm..."
            className="w-full pl-10"
          />
        </div>

        {/* Nav */}
        <nav className="ml-auto flex items-center gap-1 md:gap-2">
          {/* === MỚI: LINK ĐẤU GIÁ === */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auctions">Đấu giá</Link>
          </Button>
          {/* ======================== */}

          <Button variant="ghost" size="sm" asChild>
            <Link href="/forum">Forum</Link>
          </Button>

          <div className="h-6 w-px bg-border hidden md:block mx-2" />

          {user?.role === "admin" && (
            <Button variant="ghost" size="sm" asChild>
              <Link
                href="/admin"
                className="text-red-600 font-bold hover:text-red-700"
              >
                <ShieldCheck className="h-4 w-4 mr-1" />
                Admin
              </Link>
            </Button>
          )}

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
