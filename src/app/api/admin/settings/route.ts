// src/app/api/admin/settings/route.ts
// API này xử lý cả GET (lấy) và PATCH (cập nhật)

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
type AppSetting = {
  key: string;
  value: string | null;
};

// --- Hàm khởi tạo Admin Client ---
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("API Admin/Settings: Thiếu Key!");
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API Admin/Settings: Lỗi tạo Admin Client:", error);
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

// === HÀM GET (Lấy tất cả cài đặt) ===
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    const { data: settings, error } = await supabaseAdmin
      .from("app_settings")
      .select("*")
      .order("key", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ settings: settings || [] }, { status: 200 });
  } catch (error: unknown) {
    let message = "Lỗi server khi lấy cài đặt.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// === HÀM PATCH (Cập nhật cài đặt) ===
export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    // Nhận một MẢNG các cài đặt cần update
    const settingsToUpdate: AppSetting[] = await request.json();
    if (!Array.isArray(settingsToUpdate) || settingsToUpdate.length === 0) {
      return NextResponse.json(
        { error: "Dữ liệu cập nhật không hợp lệ." },
        { status: 400 }
      );
    }

    // Dùng .upsert() để cập nhật (hoặc tạo mới nếu key chưa có)
    const { data: updatedSettings, error } = await supabaseAdmin
      .from("app_settings")
      .upsert(settingsToUpdate) // Lệnh upsert thần thánh
      .select();

    if (error) {
      console.error("API Admin/Settings: Lỗi Upsert DB:", error);
      throw error;
    }

    return NextResponse.json(
      { settings: updatedSettings, message: "Cập nhật thành công!" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("API Admin/Settings: Lỗi bất ngờ (PATCH):", error);
    let message = "Lỗi server khi cập nhật cài đặt.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
