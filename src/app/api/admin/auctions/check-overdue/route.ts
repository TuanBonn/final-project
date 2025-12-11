import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notification";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const PAYMENT_WINDOW_HOURS = 24;

const FALLBACK_PENALTY_SCORE = 20;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function processRefunds(
  supabase: SupabaseClient,
  auctionId: string,
  productName: string,
  excludeUserId?: string
) {
  const { data: participants } = await supabase
    .from("auction_participants")
    .select("user_id")
    .eq("auction_id", auctionId);

  if (participants && participants.length > 0) {
    const PARTICIPATION_FEE = 50000;

    await Promise.all(
      participants.map(async (p) => {
        if (p.user_id === excludeUserId) return;

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
              description: `Refund (Winner unpaid): ${productName}`,
              auction_id: auctionId,
            },
          });

          await createNotification(supabase, {
            userId: p.user_id,
            title: "💰 Auction Refund",
            message: `Auction "${productName}" cancelled due to unpaid winner. Participation fee refunded.`,
            type: "wallet",
            link: "/wallet",
          });
        }
      })
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "AUCTION_PENALTY_SCORE")
      .single();

    const penaltyScore = settings?.value
      ? Number(settings.value)
      : FALLBACK_PENALTY_SCORE;

    const deadline = new Date(
      Date.now() - PAYMENT_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();

    console.log(`[Scan Overdue] Checking auctions ended before: ${deadline}`);

    const { data: overdueAuctions, error } = await supabase
      .from("auctions")
      .select(
        `
        id, winning_bidder_id, seller_id, 
        product:products(name)
      `
      )
      .eq("status", "waiting")
      .lt("end_time", deadline);

    if (error) {
      console.error("Query Error:", error);
      throw new Error(error.message);
    }

    if (!overdueAuctions || overdueAuctions.length === 0) {
      return NextResponse.json({
        message: "No overdue auctions found.",
        config: { penaltyScore, paymentWindowHours: PAYMENT_WINDOW_HOURS },
      });
    }

    let count = 0;

    await Promise.all(
      overdueAuctions.map(async (auction) => {
        const productName = auction.product?.name || "Product";
        const winnerId = auction.winning_bidder_id;

        await supabase
          .from("auctions")
          .update({ status: "cancelled" })
          .eq("id", auction.id);

        if (winnerId) {
          const { data: winner } = await supabase
            .from("users")
            .select("reputation_score")
            .eq("id", winnerId)
            .single();

          const currentScore = winner?.reputation_score || 0;
          const newScore = Math.max(0, currentScore - penaltyScore);

          await supabase
            .from("users")
            .update({ reputation_score: newScore })
            .eq("id", winnerId);

          await createNotification(supabase, {
            userId: winnerId,
            title: "🚫 Auction Penalty",
            message: `You failed to pay for "${productName}". ${penaltyScore} reputation points deducted.`,
            type: "system",
          });
        }

        await processRefunds(
          supabase,
          auction.id,
          productName,
          winnerId || undefined
        );

        await createNotification(supabase, {
          userId: auction.seller_id,
          title: "⚠️ Auction Cancelled",
          message: `Winner failed to pay for "${productName}" after ${PAYMENT_WINDOW_HOURS}h. Auction cancelled.`,
          type: "auction",
          link: `/auctions/${auction.id}`,
        });

        count++;
      })
    );

    return NextResponse.json({
      message: `Processed ${count} overdue auctions.`,
      config: { penaltyScore, paymentWindowHours: PAYMENT_WINDOW_HOURS },
    });
  } catch (error: any) {
    console.error("Scan Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
