// src/app/api/auctions/route.ts
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

// === GET: Lấy danh sách đấu giá ===
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: auctions, error } = await supabase
      .from("auctions")
      .select(
        `
        id,
        starting_bid,
        start_time,
        end_time,
        status,
        product:products ( name, image_urls, condition ),
        seller:users!seller_id ( username, avatar_url ),
        bids:bids ( bid_amount )
      `
      )
      // === CHỈ LẤY PHIÊN ĐANG HOẠT ĐỘNG HOẶC SẮP DIỄN RA ===
      .in("status", ["active", "scheduled"])
      .order("end_time", { ascending: true });

    if (error) throw error;

    const formattedAuctions = auctions?.map((auction: any) => {
      const highestBid =
        auction.bids?.length > 0
          ? Math.max(...auction.bids.map((b: any) => Number(b.bid_amount)))
          : 0;
      const currentPrice = Math.max(Number(auction.starting_bid), highestBid);

      return {
        id: auction.id,
        productName: auction.product?.name,
        productImage: auction.product?.image_urls?.[0] || null,
        condition: auction.product?.condition,
        sellerName: auction.seller?.username,
        sellerAvatar: auction.seller?.avatar_url,
        currentPrice: currentPrice,
        endTime: auction.end_time,
        startTime: auction.start_time,
        status: auction.status,
        bidCount: auction.bids?.length || 0,
      };
    });

    return NextResponse.json(
      { auctions: formattedAuctions || [] },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// === POST: Tạo đấu giá mới ===
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      name,
      description,
      brand_id,
      condition,
      imageUrls,
      startingBid,
      startTime,
      endTime,
    } = body;

    if (
      !name ||
      !startingBid ||
      !startTime ||
      !endTime ||
      !brand_id ||
      !condition
    ) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc." },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (end <= start)
      return NextResponse.json(
        { error: "Thời gian kết thúc phải sau bắt đầu." },
        { status: 400 }
      );
    if (end <= now)
      return NextResponse.json(
        { error: "Thời gian kết thúc không hợp lệ." },
        { status: 400 }
      );

    // Tạo sản phẩm mới với trạng thái 'in_transaction'
    const { data: newProduct, error: prodError } = await supabase
      .from("products")
      .insert({
        seller_id: userId,
        name: name,
        description: description,
        price: startingBid.toString().replace(/\D/g, ""),
        brand_id: brand_id,
        condition: condition,
        image_urls: imageUrls || [],
        status: "in_transaction",
      })
      .select()
      .single();

    if (prodError || !newProduct) {
      console.error("Lỗi tạo sản phẩm:", prodError);
      throw new Error("Không thể tạo sản phẩm cho phiên đấu giá.");
    }

    let initialStatus = "draft";
    if (start <= now) {
      initialStatus = "active";
    } else {
      initialStatus = "scheduled";
    }

    const { data: newAuction, error: auctionError } = await supabase
      .from("auctions")
      .insert({
        product_id: newProduct.id,
        seller_id: userId,
        starting_bid: startingBid.replace(/\D/g, ""),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: initialStatus,
      })
      .select()
      .single();

    if (auctionError) {
      await supabase.from("products").delete().eq("id", newProduct.id);
      throw auctionError;
    }

    return NextResponse.json(
      { message: "Tạo phiên đấu giá thành công!", auction: newAuction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create Auction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
