// src/app/admin/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar"; // <-- IMPORT SIDEBAR MỚI

interface JwtPayload {
  userId: string;
  email: string;
  role: "user" | "dealer" | "admin";
}

const COOKIE_NAME = "auth-token";
const JWT_SECRET = process.env.JWT_SECRET;

async function verifyAdmin(): Promise<JwtPayload | null> {
  if (!JWT_SECRET) return null;

  try {
    const cookieStore = await cookies(); // ✅
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded?.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

export default async function AdminSecurityLayout({
  children,
}: {
  children: ReactNode;
}) {
  const adminUser = await verifyAdmin();

  if (!adminUser) {
    console.warn("ACCESS DENIED: Non-admin user tried to access /admin");
    redirect("/"); // Giữ nguyên logic bảo mật
  }

  // === THAY ĐỔI BẮT ĐẦU TỪ ĐÂY ===
  // Thay vì chỉ trả về {children}, chúng ta bọc nó trong layout
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {" "}
      {/* 4rem là chiều cao Header */}
      {/* 1. Sidebar */}
      <AdminSidebar />
      {/* 2. Content Area */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
  // === THAY ĐỔI KẾT THÚC TẠI ĐÂY ===
}
