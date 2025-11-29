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

function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
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
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  if (!supabase)
    return NextResponse.json({ error: "Config Error" }, { status: 500 });

  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("balance, bank_info")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    const { data: history, error: historyError } = await supabase
      .from("platform_payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (historyError) throw historyError;

    const { data: appSettings } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["BANK_ID", "ACCOUNT_NO", "ACCOUNT_NAME", "QR_TEMPLATE"]);

    const systemBankInfo = {
      bankId: appSettings?.find((s) => s.key === "BANK_ID")?.value || "MB",
      accountNo: appSettings?.find((s) => s.key === "ACCOUNT_NO")?.value || "",
      accountName:
        appSettings?.find((s) => s.key === "ACCOUNT_NAME")?.value || "",
      template:
        appSettings?.find((s) => s.key === "QR_TEMPLATE")?.value || "compact2",
    };

    return NextResponse.json(
      {
        balance: user.balance,
        bankInfo: user.bank_info,
        history: history || [],
        systemBankInfo,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  if (!supabase)
    return NextResponse.json({ error: "Config Error" }, { status: 500 });

  try {
    const { type, amount, bankInfo } = await request.json();

    if (!amount || amount < 10000) {
      return NextResponse.json(
        { error: "Minimum amount is 10,000 VND" },
        { status: 400 }
      );
    }

    if (type === "deposit") {
      const { data, error } = await supabase
        .from("platform_payments")
        .insert({
          user_id: userId,
          amount: amount,
          payment_for_type: "deposit",
          status: "pending",
          currency: "VND",
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(
        { message: "Deposit request created.", payment: data },
        { status: 201 }
      );
    } else if (type === "withdrawal") {
      if (
        !bankInfo?.bankName ||
        !bankInfo?.accountNo ||
        !bankInfo?.accountName
      ) {
        return NextResponse.json(
          { error: "Missing bank information." },
          { status: 400 }
        );
      }

      const { data: user } = await supabase
        .from("users")
        .select("balance")
        .eq("id", userId)
        .single();

      if (!user || user.balance < amount) {
        return NextResponse.json(
          { error: "Insufficient balance." },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("platform_payments")
        .insert({
          user_id: userId,
          amount: amount,
          payment_for_type: "withdrawal",
          status: "pending",
          currency: "VND",
          withdrawal_info: bankInfo,
        })
        .select()
        .single();

      await supabase
        .from("users")
        .update({ balance: user.balance - amount })
        .eq("id", userId);

      if (error) throw error;
      return NextResponse.json(
        { message: "Withdrawal request submitted.", payment: data },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "Invalid transaction type." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
