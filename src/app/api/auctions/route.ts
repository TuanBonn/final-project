import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);

  const statusFilter =
    searchParams.getAll("status").length > 0
      ? searchParams.getAll("status")
      : ["active", "waiting"];

  const limit = parseInt(searchParams.get("limit") || "20");

  try {
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
      .in("status", statusFilter)
      .order("end_time", { ascending: true })
      .limit(limit);

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
    console.error("GET Auctions Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      endTime,
    } = body;

    if (!name || !startingBid || !endTime || !brand_id || !condition) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const start = new Date();
    const end = new Date(endTime);

    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be in the future." },
        { status: 400 }
      );
    }

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
        status: "auction",
      })
      .select()
      .single();

    if (prodError || !newProduct) {
      console.error("Product creation error:", prodError);
      throw new Error("Failed to create product for auction.");
    }

    const { data: newAuction, error: auctionError } = await supabase
      .from("auctions")
      .insert({
        product_id: newProduct.id,
        seller_id: userId,
        starting_bid: startingBid.replace(/\D/g, ""),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "active",
      })
      .select()
      .single();

    if (auctionError) {
      await supabase.from("products").delete().eq("id", newProduct.id);
      throw auctionError;
    }

    return NextResponse.json(
      { message: "Auction started successfully!", auction: newAuction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create Auction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
