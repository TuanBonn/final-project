// src/app/api/admin/stats/route.ts
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

    // 4. Đếm Đấu giá active
    const { count: auctionCount } = await supabaseAdmin
      .from("auctions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // 5. TÍNH TỔNG DOANH THU (Platform Commission + Fees)

    // A. Hoa hồng từ giao dịch
    const { data: txRevenue } = await supabaseAdmin
      .from("transactions")
      .select("platform_commission")
      .eq("status", "completed");

    const commissionRevenue =
      txRevenue?.reduce(
        (acc, item) => acc + Number(item.platform_commission || 0),
        0
      ) || 0;

    // B. Các loại phí thu trực tiếp (Đấu giá, Verify, Dealer)
    const { data: feeRevenue } = await supabaseAdmin
      .from("platform_payments")
      .select("amount")
      .eq("status", "succeeded")
      .in("payment_for_type", [
        "auction_creation_fee",
        "auction_bid_fee",
        "dealer_subscription", // <--- MỚI
        "verification_fee", // <--- MỚI
      ]);

    const otherFeesRevenue =
      feeRevenue?.reduce((acc, item) => acc + Number(item.amount || 0), 0) || 0;

    const totalRevenue = commissionRevenue + otherFeesRevenue;

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
