// // src/app/api/admin/stats/route.ts
// import { NextResponse, type NextRequest } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import { parse as parseCookie } from "cookie";
// import jwt from "jsonwebtoken";

// export const runtime = "nodejs";

// // --- Cấu hình ---
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const JWT_SECRET = process.env.JWT_SECRET;
// const COOKIE_NAME = "auth-token";

// interface JwtPayload {
//   role?: string;
//   [key: string]: unknown;
// }

// // --- Hàm khởi tạo Admin Client ---
// function getSupabaseAdmin(): SupabaseClient | null {
//   if (!supabaseUrl || !supabaseServiceKey) return null;
//   try {
//     return createClient(supabaseUrl, supabaseServiceKey, {
//       auth: { persistSession: false },
//     });
//   } catch (error) {
//     return null;
//   }
// }

// // --- Hàm xác thực Admin ---
// async function verifyAdmin(request: NextRequest): Promise<boolean> {
//   if (!JWT_SECRET) return false;
//   try {
//     let token: string | undefined = undefined;
//     const cookieHeader = request.headers.get("cookie");
//     if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
//     if (!token) return false;
//     const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
//     return decoded.role === "admin";
//   } catch (error) {
//     return false;
//   }
// }

// // === HÀM GET (Lấy tất cả stats) ===
// export async function GET(request: NextRequest) {
//   if (!(await verifyAdmin(request))) {
//     return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
//   }

//   try {
//     const supabaseAdmin = getSupabaseAdmin();
//     if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

//     // 1. Đếm Users
//     const { count: userCount, error: userError } = await supabaseAdmin
//       .from("users")
//       .select("*", { count: "exact", head: true });

//     // 2. Đếm Sản phẩm đang bán
//     const { count: productCount, error: productError } = await supabaseAdmin
//       .from("products")
//       .select("*", { count: "exact", head: true })
//       .eq("status", "available");

//     // 3. Đếm Giao dịch (tháng này - ví dụ)
//     // (Để đơn giản, ta đếm tổng số giao dịch trước)
//     const { count: transactionCount, error: transError } = await supabaseAdmin
//       .from("transactions")
//       .select("*", { count: "exact", head: true })
//       .eq("status", "completed"); // Chỉ đếm giao dịch đã xong

//     // 4. Tính tổng doanh thu (hoa hồng)
//     const { data: revenueData, error: revenueError } = await supabaseAdmin
//       .from("transactions")
//       .select("platform_commission")
//       .eq("status", "completed");

//     if (userError || productError || transError || revenueError) {
//       console.error("Lỗi khi query stats:", {
//         userError,
//         productError,
//         transError,
//         revenueError,
//       });
//       throw new Error("Lỗi khi query CSDL để lấy stats.");
//     }

//     const totalRevenue =
//       revenueData?.reduce(
//         (acc, item) => acc + Number(item.platform_commission || 0),
//         0
//       ) || 0;

//     const stats = {
//       userCount: userCount ?? 0,
//       productCount: productCount ?? 0,
//       transactionCount: transactionCount ?? 0,
//       totalRevenue: totalRevenue,
//     };

//     return NextResponse.json({ stats }, { status: 200 });
//   } catch (error: unknown) {
//     let message = "Lỗi server khi lấy stats.";
//     if (error instanceof Error) message = error.message;
//     return NextResponse.json({ error: message }, { status: 500 });
//   }
// }

// src/app/api/admin/stats/route.ts
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

function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    let token: string | undefined = undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    // 1. Đếm Users
    const { count: userCount } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true });

    // 2. Đếm Sản phẩm (Chỉ đếm sản phẩm đang bán)
    const { count: productCount } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("status", "available");

    // 3. Đếm Giao dịch thành công
    const { count: transactionCount } = await supabaseAdmin
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    // 4. Tính tổng doanh thu
    const { data: revenueData } = await supabaseAdmin
      .from("transactions")
      .select("platform_commission")
      .eq("status", "completed");

    const totalRevenue =
      revenueData?.reduce(
        (acc, item) => acc + Number(item.platform_commission || 0),
        0
      ) || 0;

    // 5. Đếm phiên đấu giá đang chạy (Mới thêm)
    const { count: auctionCount } = await supabaseAdmin
      .from("auctions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const stats = {
      userCount: userCount ?? 0,
      productCount: productCount ?? 0,
      transactionCount: transactionCount ?? 0,
      totalRevenue: totalRevenue,
      auctionCount: auctionCount ?? 0,
    };

    return NextResponse.json({ stats }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Lỗi server lấy stats." },
      { status: 500 }
    );
  }
}
