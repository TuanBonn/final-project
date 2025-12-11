import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";
interface JwtPayload {
  role?: string;
  [key: string]: unknown;
}

function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("API Admin/PATCH: Thiếu Supabase URL hoặc Service Key!");
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API Admin/PATCH: Lỗi tạo Admin Client:", error);
    return null;
  }
}

export async function PATCH(
  request: NextRequest,

  ctx: { params: Promise<{ id: string }> }
) {
  try {
    let token: string | undefined = undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token)
      return NextResponse.json({ error: "Yêu cầu xác thực." }, { status: 401 });
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Không có quyền truy cập." },
        { status: 403 }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: "Token không hợp lệ." }, { status: 401 });
  }

  const { id: targetUserId } = await ctx.params;

  if (!targetUserId) {
    return NextResponse.json(
      { error: "Thiếu ID user cần cập nhật." },
      { status: 400 }
    );
  }

  let updateData: {
    status?: "active" | "banned";
    role?: "user" | "dealer";
    is_verified?: boolean;
  } = {};

  try {
    const body = await request.json();

    if (body.status && ["active", "banned"].includes(body.status)) {
      updateData.status = body.status;
    }
    if (body.role && ["user", "dealer"].includes(body.role)) {
      updateData.role = body.role;
    }
    if (
      body.is_verified !== undefined &&
      typeof body.is_verified === "boolean"
    ) {
      updateData.is_verified = body.is_verified;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Không có lệnh cập nhật hợp lệ." },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Request body không hợp lệ." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", targetUserId)
      .select("id, username, status, role, is_verified")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Không tìm thấy user để cập nhật." },
          { status: 404 }
        );
      }
      throw error;
    }
    if (!updatedUser) {
      throw new Error("Update OK nhưng không nhận được data trả về.");
    }

    return NextResponse.json(
      { user: updatedUser, message: "Cập nhật thành công!" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("API Admin/PATCH: Lỗi bất ngờ:", error);
    let message = "Lỗi server khi cập nhật user.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
