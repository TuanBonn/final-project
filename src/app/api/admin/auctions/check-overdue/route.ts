// src/app/api/admin/auctions/check-overdue/route.ts
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

const DEFAULT_PENALTY_SCORE = 20;
const PAYMENT_WINDOW_HOURS = 0;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    let token: string | undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "AUCTION_PENALTY_SCORE")
      .single();

    const penaltyScore = setting?.value
      ? parseInt(setting.value)
      : DEFAULT_PENALTY_SCORE;

    const deadline = new Date();
    deadline.setHours(deadline.getHours() - PAYMENT_WINDOW_HOURS);

    const { data: auctions, error } = await supabase
      .from("auctions")
      .select(
        `
        id, product_id, winning_bidder_id, end_time, status, seller_id,
        product:products ( name ),
        winner:users!winning_bidder_id ( username, reputation_score )
      `
      )
      .eq("status", "ended")
      .lt("end_time", deadline.toISOString())
      .not("winning_bidder_id", "is", null);

    if (error) throw error;

    let processedCount = 0;

    for (const auction of auctions || []) {
      const { data: transaction } = await supabase
        .from("transactions")
        .select("id")
        .eq("product_id", auction.product_id)
        .eq("buyer_id", auction.winning_bidder_id)
        .neq("status", "cancelled")
        .maybeSingle();

      if (transaction) continue;

      console.log(`Phát hiện bùng kèo: Auction ${auction.id}`);

      // 1. Trừ điểm
      const newScore = (auction.winner.reputation_score || 0) - penaltyScore;
      await supabase
        .from("users")
        .update({ reputation_score: newScore })
        .eq("id", auction.winning_bidder_id);

      // 2. Hủy phiên
      await supabase
        .from("auctions")
        .update({ status: "cancelled" })
        .eq("id", auction.id);

      // 3. Set status sản phẩm thành 'auction' (Lock vĩnh viễn như yêu cầu)
      await supabase
        .from("products")
        .update({ status: "auction" })
        .eq("id", auction.product_id);

      // 4. Thông báo
      await createNotification(supabase, {
        userId: auction.winning_bidder_id,
        title: "🚫 BẠN ĐÃ BỊ TRỪ ĐIỂM UY TÍN",
        message: `Bạn đã không thanh toán cho sản phẩm "${auction.product?.name}" trong vòng 24h.`,
        type: "system",
        link: "/profile",
      });

      await createNotification(supabase, {
        userId: auction.seller_id,
        title: "⚠️ Người thắng không thanh toán",
        message: `Người thắng đấu giá "${auction.product?.name}" đã bỏ cuộc. Sản phẩm đã được chuyển sang trạng thái 'Auction Products' (Đã lưu kho).`,
        type: "auction",
        link: "/auctions",
      });

      processedCount++;
    }

    return NextResponse.json(
      {
        message: `Đã quét xong. Xử lý ${processedCount} trường hợp.`,
        processed: processedCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error scanning overdue auctions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
