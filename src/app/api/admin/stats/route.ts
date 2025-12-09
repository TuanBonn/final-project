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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Supabase Admin Client Error");

    // 1. Count Users
    const { count: userCount } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true });

    // 2. Count Products (Available)
    const { count: productCount } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("status", "available");

    // 3. Count Completed Transactions
    const { count: transactionCount } = await supabaseAdmin
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    // 4. Count Active Auctions
    const { count: auctionCount } = await supabaseAdmin
      .from("auctions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // 5. CALCULATE TOTAL REVENUE (Net)

    // A. Revenue from Commissions
    const { data: txRevenue } = await supabaseAdmin
      .from("transactions")
      .select("platform_commission")
      .eq("status", "completed");

    const commissionRevenue =
      txRevenue?.reduce(
        (acc, item) => acc + Number(item.platform_commission || 0),
        0
      ) || 0;

    // B. Revenue from Direct Fees
    const { data: feeRevenue } = await supabaseAdmin
      .from("platform_payments")
      .select("amount")
      .eq("status", "succeeded")
      .in("payment_for_type", [
        "auction_creation_fee",
        "auction_bid_fee",
        "dealer_subscription",
        "verification_fee",
      ]);

    const otherFeesRevenue =
      feeRevenue?.reduce((acc, item) => acc + Number(item.amount || 0), 0) || 0;

    // C. [NEW] Subtract Refunds
    const { data: feeRefunds } = await supabaseAdmin
      .from("platform_payments")
      .select("amount")
      .eq("status", "succeeded")
      .eq("payment_for_type", "auction_fee_refund");

    const totalRefunds =
      feeRefunds?.reduce((acc, item) => acc + Number(item.amount || 0), 0) || 0;

    // Net Revenue = Commission + Fees - Refunds
    const totalRevenue = commissionRevenue + otherFeesRevenue - totalRefunds;

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
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
