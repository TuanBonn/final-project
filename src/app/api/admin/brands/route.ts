// src/app/api/admin/brands/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

// --- Cấu hình ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

interface JwtPayload {
  role?: string;
  [key: string]: unknown;
}

// --- Hàm khởi tạo Admin Client ---
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    return null;
  }
}

// --- Hàm xác thực Admin ---
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    let token: string | undefined = undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded.role === "admin";
  } catch (error) {
    return false;
  }
}

// === HÀM GET (Lấy tất cả brands) ===
export async function GET(request: NextRequest) {
  // Không cần xác thực admin, vì trang /sell và /filter cũng cần
  // (Chúng ta sẽ tạo 1 API public /api/brands sau, tạm thời dùng cái này)
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    const { data: brands, error } = await supabaseAdmin
      .from("brands")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ brands: brands || [] }, { status: 200 });
  } catch (error: unknown) {
    let message = "Lỗi server khi lấy brands.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// === HÀM POST (Tạo brand mới) ===
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  try {
    const { name } = await request.json();
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Tên brand là bắt buộc." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    const { data, error } = await supabaseAdmin
      .from("brands")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Lỗi unique constraint (tên đã tồn tại)
        return NextResponse.json(
          { error: `Brand "${name}" đã tồn tại.` },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      { brand: data, message: "Tạo brand thành công!" },
      { status: 201 }
    );
  } catch (error: unknown) {
    let message = "Lỗi server khi tạo brand.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
