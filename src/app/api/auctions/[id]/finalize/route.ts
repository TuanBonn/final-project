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

async function processRefunds(
  supabase: SupabaseClient,
  auctionId: string,
  productName: string,
  reason: string
) {
  const { data: participants } = await supabase
    .from("auction_participants")
    .select("user_id")
    .eq("auction_id", auctionId);

  if (participants && participants.length > 0) {
    const PARTICIPATION_FEE = 50000;

    await Promise.all(
      participants.map(async (p) => {
        const { data: user } = await supabase
          .from("users")
          .select("balance")
          .eq("id", p.user_id)
          .single();

        if (user) {
          await supabase
            .from("users")
            .update({ balance: Number(user.balance) + PARTICIPATION_FEE })
            .eq("id", p.user_id);

          await supabase.from("platform_payments").insert({
            user_id: p.user_id,
            amount: PARTICIPATION_FEE,
            currency: "VND",
            payment_for_type: "auction_fee_refund",
            status: "succeeded",
            withdrawal_info: {
              description: `Auction Fee Refund: ${productName}`,
              auction_id: auctionId,
              reason: reason,
            },
          });

          await createNotification(supabase, {
            userId: p.user_id,
            title: "💰 Auction Refund",
            message: `Auction "${productName}" was cancelled (${reason}). You have been refunded ${PARTICIPATION_FEE.toLocaleString()} VND.`,
            type: "wallet",
            link: "/wallet",
          });
        }
      })
    );
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const userId = await getUserId(request);
  const supabase = getSupabaseAdmin();

  const body = await request.json().catch(() => ({}));
  const { status, isAdmin } = body;

  try {
    const { data: auction } = await supabase
      .from("auctions")
      .select("*, bids(*), product:products(name)")
      .eq("id", id)
      .single();

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (!isAdmin && auction.seller_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (auction.status !== "active" && auction.status !== "waiting") {
      return NextResponse.json(
        { error: "Auction is not active or waiting" },
        { status: 400 }
      );
    }

    const productName = auction.product?.name || "Product";

    if (status === "cancelled") {
      await supabase
        .from("auctions")
        .update({ status: "cancelled" })
        .eq("id", id);

      await processRefunds(
        supabase,
        id,
        productName,
        "Cancelled by Admin/Host"
      );

      return NextResponse.json({
        message: "Auction cancelled and participants refunded.",
      });
    }

    const bids = auction.bids || [];

    if (bids.length === 0) {
      await supabase
        .from("auctions")
        .update({ status: "cancelled" })
        .eq("id", id);

      await processRefunds(supabase, id, productName, "No bids placed");

      return NextResponse.json({
        message: "No bids. Auction cancelled and refunded.",
      });
    }

    const winningBid = bids.sort(
      (a: any, b: any) => Number(b.bid_amount) - Number(a.bid_amount)
    )[0];

    await supabase
      .from("auctions")
      .update({
        status: "waiting",
        winning_bidder_id: winningBid.bidder_id,
      })
      .eq("id", id);

    await createNotification(supabase, {
      userId: winningBid.bidder_id,
      title: "🎉 You Won!",
      message: `You won the auction for "${productName}". Please proceed to payment.`,
      type: "auction",
      link: `/auctions/${id}`,
    });

    return NextResponse.json({
      message: "Auction ended. Waiting for payment.",
    });
  } catch (error: any) {
    console.error("Finalize Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
