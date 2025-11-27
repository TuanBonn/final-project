// src/app/api/group-buys/participant/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";
import { createNotification } from "@/lib/notification";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

// ... (Giữ nguyên các hàm helper getSupabaseAdmin, getUserId như cũ) ...
function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

interface JwtPayload {
  userId: string;
  [key: string]: unknown;
}

async function getUserId(request: NextRequest): Promise<string | null> {
  if (!JWT_SECRET) return null;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;
    const token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  try {
    const { action, groupBuyId, reason } = await request.json();

    // Lấy thông tin Kèo để hiển thị tên trong thông báo
    const { data: gb } = await supabase
      .from("group_buys")
      .select("product_name")
      .eq("id", groupBuyId)
      .single();

    if (!gb) return NextResponse.json({ error: "Kèo lỗi" }, { status: 404 });

    // === CHỈ CÒN GIỮ LẠI ACTION: BÁO CÁO / YÊU CẦU HỦY ===
    // (Các action 'ship' và 'confirm' đã bị xóa vì chuyển sang module Orders)

    if (action === "report") {
      if (!reason)
        return NextResponse.json(
          { error: "Vui lòng nhập lý do" },
          { status: 400 }
        );

      // 1. Lấy danh sách Admin
      const { data: admins } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        // 2. Lấy thông tin người báo cáo
        const { data: reporter } = await supabase
          .from("users")
          .select("username")
          .eq("id", userId)
          .single();

        // 3. Gửi thông báo cho từng Admin
        for (const admin of admins) {
          await createNotification(supabase, {
            userId: admin.id,
            title: "🚨 Yêu cầu Hủy Kèo Mua Chung",
            message: `User @${reporter?.username} yêu cầu hủy kèo "${gb.product_name}". Lý do: "${reason}". Vui lòng vào Admin Panel để xử lý.`,
            type: "system",
            link: `/admin/group-buys`,
          });
        }
      }

      return NextResponse.json(
        {
          message:
            "Đã gửi báo cáo cho Admin. Ban quản trị sẽ xem xét sớm nhất.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
