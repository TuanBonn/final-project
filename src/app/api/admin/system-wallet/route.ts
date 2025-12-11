import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return false;
    const token = parseCookie(cookieHeader)[COOKIE_NAME];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
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
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search");
    const status = searchParams.get("status");

    let query = supabase!
      .from("platform_payments")
      .select(
        `
        id, amount, payment_for_type, status, created_at,
        user:users(username, email)
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      const { data: foundUsers } = await supabase!
        .from("users")
        .select("id")
        .or(`username.ilike.%${search}%,email.ilike.%${search}%`);

      const userIds = foundUsers?.map((u) => u.id) || [];

      if (userIds.length > 0) {
        query = query.in("user_id", userIds);
      } else {
        query = query.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    const { data: deposits } = await supabase!
      .from("platform_payments")
      .select("amount")
      .in("payment_for_type", ["deposit", "group_buy_order"])
      .eq("status", "succeeded");

    const totalDeposits =
      deposits?.reduce((a, b) => a + Number(b.amount), 0) || 0;

    const { data: withdrawals } = await supabase!
      .from("platform_payments")
      .select("amount")
      .in("payment_for_type", [
        "withdrawal",
        "group_buy_refund",
        "auction_fee_refund",
      ])
      .eq("status", "succeeded");

    const totalWithdrawals =
      withdrawals?.reduce((a, b) => a + Number(b.amount), 0) || 0;

    return NextResponse.json(
      {
        logs: logs || [],
        summary: {
          totalDeposits,
          totalWithdrawals,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
