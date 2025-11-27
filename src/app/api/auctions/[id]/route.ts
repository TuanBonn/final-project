// src/app/api/auctions/[id]/route.ts
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
  const { id: auctionId } = await ctx.params;
  const userId = await getUserId(request); // Lấy ID người dùng hiện tại

  try {
    const supabase = getSupabaseAdmin();

    // 1. Lấy thông tin đấu giá
    const { data: auction, error } = await supabase
      .from("auctions")
      .select(
        `
        id,
        product_id,
        starting_bid,
        start_time,
        end_time,
        status,
        winning_bidder_id,
        product:products ( id, name, description, image_urls, condition, quantity ),
        seller:users!seller_id ( id, username, avatar_url, reputation_score )
      `
      )
      .eq("id", auctionId)
      .single();

    if (error) {
      console.error("Supabase Query Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!auction) {
      return NextResponse.json(
        { error: "Không tìm thấy phiên đấu giá" },
        { status: 404 }
      );
    }

    // 2. Lấy lịch sử Bid
    const { data: bids } = await supabase
      .from("bids")
      .select(
        `
        id,
        bid_amount,
        created_at,
        bidder:users ( username, avatar_url )
      `
      )
      .eq("auction_id", auctionId)
      .order("bid_amount", { ascending: false });

    const highestBid = bids && bids.length > 0 ? Number(bids[0].bid_amount) : 0;
    const currentPrice = Math.max(Number(auction.starting_bid), highestBid);

    // 3. Check đơn hàng đã tạo chưa (cho logic thắng giải)
    const { data: transaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("auction_id", auctionId)
      .maybeSingle();

    // === 4. QUAN TRỌNG: KIỂM TRA ĐÃ THAM GIA CHƯA ===
    let isJoined = false;
    if (userId) {
      // Kiểm tra trong bảng auction_participants xem có user này không
      const { data: participant } = await supabase
        .from("auction_participants")
        .select("user_id")
        .eq("auction_id", auctionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (participant) {
        isJoined = true;
      }
    }
    // ================================================

    return NextResponse.json(
      {
        auction: {
          ...auction,
          currentPrice,
          bids: bids || [],
          orderId: transaction?.id || null,
          isJoined: isJoined, // Trả về true nếu đã tham gia
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
