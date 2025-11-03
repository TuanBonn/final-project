// src/app/admin/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { ReactNode } from "react";

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
    redirect("/");
  }

  return <>{children}</>;
}
