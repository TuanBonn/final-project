// src/components/admin/AdminSidebar.tsx
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
  Library, // <-- Icon mới
} from "lucide-react";

// Danh sách các link trong sidebar
const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/users",
    label: "Quản lý Users",
    icon: Users,
  },
  {
    href: "/admin/products",
    label: "Quản lý Sản phẩm",
    icon: Package,
  },
  // === LINK MỚI ===
  {
    href: "/admin/brands",
    label: "Quản lý Brands",
    icon: Library,
  },
  // ================
  {
    href: "/admin/settings",
    label: "Cài đặt Chung",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r bg-muted/30 p-4 md:flex">
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          // Sửa logic active (để highlight đúng)
          const isActive =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Button
              key={item.label}
              asChild
              variant={isActive ? "secondary" : "ghost"}
              className="justify-start"
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
