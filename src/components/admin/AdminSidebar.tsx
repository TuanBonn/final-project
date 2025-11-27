"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  Library,
  Receipt,
  Gavel,
  CreditCard,
  MessageSquare,
  ShoppingBag,
  Landmark, // Icon cho System Wallet
} from "lucide-react";

// Danh sách các link trong sidebar (Tiếng Anh)
const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/users",
    label: "User Management",
    icon: Users,
  },
  {
    href: "/admin/posts",
    label: "Post Management",
    icon: MessageSquare,
  },
  {
    href: "/admin/transactions",
    label: "Transactions",
    icon: Receipt,
  },
  {
    href: "/admin/group-buys",
    label: "Group Buys",
    icon: ShoppingBag,
  },
  {
    href: "/admin/system-wallet",
    label: "System Wallet", // Ví hệ thống
    icon: Landmark,
  },
  {
    href: "/admin/payments",
    label: "Payment History",
    icon: CreditCard,
  },
  {
    href: "/admin/auctions",
    label: "Auctions",
    icon: Gavel,
  },
  {
    href: "/admin/products",
    label: "Product Management",
    icon: Package,
  },
  {
    href: "/admin/brands",
    label: "Brand Management",
    icon: Library,
  },
  {
    href: "/admin/settings",
    label: "System Settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r bg-muted/30 p-4 md:flex h-full">
      <div className="mb-4 px-4 text-lg font-bold tracking-tight text-primary/80">
        Admin Panel
      </div>
      <nav className="flex flex-col gap-1 overflow-y-auto flex-1">
        {navItems.map((item) => {
          // Logic active:
          // - Nếu href là "/admin" (Dashboard) -> Phải khớp chính xác
          // - Các mục khác -> Chỉ cần bắt đầu bằng href (để active cả trang con)
          const isActive =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "justify-start transition-colors",
                isActive && "bg-secondary font-medium text-primary"
              )}
            >
              <Link href={item.href}>
                <item.icon
                  className={cn(
                    "mr-2 h-4 w-4",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
