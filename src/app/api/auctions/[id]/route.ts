// src/app/api/auctions/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";
import { createNotification } from "@/lib/notification";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

interface JwtPayload {
  userId: string;
  [key: string]: unknown;
}

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
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

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();
  const userId = await getUserId(request);

  try {
    // --- 1. AUTO CLEANUP (Logic đơn lẻ cho 1 phiên) ---
    // Kiểm tra xem phiên này có cần cập nhật status không trước khi trả về
    const now = new Date().toISOString();
    const { data: currentAuction } = await supabase
      .from("auctions")
      .select(
        `id, status, end_time, seller_id, product:products(name), bids(bid_amount, bidder_id)`
      )
      .eq("id", id)
      .single();

    if (
      currentAuction &&
      currentAuction.status === "active" &&
      new Date(currentAuction.end_time) < new Date()
    ) {
      const bids = currentAuction.bids || [];
      const productName = currentAuction.product?.name || "Sản phẩm";

      if (bids.length === 0) {
        // Không ai mua -> Cancelled
        await supabase
          .from("auctions")
          .update({ status: "cancelled" })
          .eq("id", id);
      } else {
        // Có người mua -> Waiting
        const winningBid = bids.sort(
          (a: any, b: any) => Number(b.bid_amount) - Number(a.bid_amount)
        )[0];
        if (winningBid) {
          await supabase
            .from("auctions")
            .update({
              status: "waiting",
              winning_bidder_id: winningBid.bidder_id,
            })
            .eq("id", id);

          // Gửi noti (Tùy chọn, để đảm bảo không spam nếu user refresh nhiều lần thì nên check kĩ hơn,
          // nhưng ở đây ta tập trung vào việc update status DB)
        }
      }
    }
    // --------------------------------------------------

    // --- 2. QUERY DỮ LIỆU CHI TIẾT ---
    const { data: auction, error } = await supabase
      .from("auctions")
      .select(
        `
        id,
        product_id,
        status,
        starting_bid,
        start_time,
        end_time,
        winning_bidder_id,
        product:products (
          id, name, description, image_urls, condition, quantity, status
        ),
        seller:users!seller_id (
          id, username, avatar_url, reputation_score
        ),
        bids:bids (
          id, bid_amount, created_at,
          bidder:users ( username, avatar_url )
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    // Xác định Order ID nếu đã có giao dịch (để hiển thị nút "Xem đơn hàng")
    let orderId = null;
    if (auction.status === "ended") {
      const { data: tx } = await supabase
        .from("transactions")
        .select("id")
        .eq("auction_id", id)
        .neq("status", "cancelled")
        .maybeSingle();
      if (tx) orderId = tx.id;
    }

    // Logic tính giá hiện tại
    const highestBid =
      auction.bids?.length > 0
        ? Math.max(...auction.bids.map((b: any) => Number(b.bid_amount)))
        : 0;
    const currentPrice = Math.max(Number(auction.starting_bid), highestBid);

    // Check user hiện tại có phải đã join không (để hiện nút join/bid)
    const isJoined = userId
      ? !!(
          await supabase
            .from("auction_participants")
            .select("user_id")
            .eq("auction_id", id)
            .eq("user_id", userId)
            .maybeSingle()
        )?.data
      : false;

    return NextResponse.json(
      {
        auction: {
          ...auction,
          currentPrice,
          isJoined,
          orderId, // Trả về ID đơn hàng nếu đã kết thúc
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
