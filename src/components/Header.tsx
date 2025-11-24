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
  MessageCircle, // <-- THÊM ICON CHAT
} from "lucide-react";
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

        {/* Nav & Icons */}
        <nav className="ml-auto flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auctions">Đấu giá</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/forum">Forum</Link>
          </Button>

          <div className="h-6 w-px bg-border hidden md:block" />

          {/* === NÚT TIN NHẮN (Chỉ hiện khi đã đăng nhập) === */}
          {user && (
            <Button variant="ghost" size="icon" asChild title="Tin nhắn">
              <Link href="/messages">
                <MessageCircle className="h-5 w-5" />
              </Link>
            </Button>
          )}
          {/* ============================================== */}

          {/* Admin Panel (Chỉ Admin thấy) */}
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

          {/* Avatar / Login */}
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

          {/* Giỏ hàng */}
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
