// src/app/api/admin/settings/route.ts

import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

// --- Configuration ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

interface JwtPayload {
  role?: string;
  [key: string]: unknown;
}
type AppSetting = {
  key: string;
  value: string | null;
};

// --- Helpers ---
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    return null;
  }
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
  } catch (error) {
    return false;
  }
}

// === GET METHOD ===
export async function GET(request: NextRequest) {
  // Check if the requester is an admin
  const isAdmin = await verifyAdmin(request);

  // Define keys that are public/visible to regular users
  // These are needed for the UpgradeAccount component
  const PUBLIC_KEYS = ["verification_fee", "dealer_subscription"];

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Admin Client Error");

    let query = supabaseAdmin
      .from("app_settings")
      .select("*")
      .order("key", { ascending: true });

    // If NOT admin, filter to return ONLY public keys
    if (!isAdmin) {
      query = query.in("key", PUBLIC_KEYS);
    }

    const { data: settings, error } = await query;

    if (error) throw error;

    return NextResponse.json({ settings: settings || [] }, { status: 200 });
  } catch (error: unknown) {
    let message = "Server error while fetching settings.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// === PATCH METHOD (Update settings) ===
export async function PATCH(request: NextRequest) {
  // Strictly allow ONLY admins to update settings
  if (!(await verifyAdmin(request))) {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Admin Client Error");

    const settingsToUpdate: AppSetting[] = await request.json();
    if (!Array.isArray(settingsToUpdate) || settingsToUpdate.length === 0) {
      return NextResponse.json(
        { error: "Invalid update data." },
        { status: 400 }
      );
    }

    // === DATA TRANSFORMATION LOGIC ===
    const transformedSettings = settingsToUpdate.map((setting) => {
      // 1. Logic for PERCENT keys
      const percentKeys = ["TRANSACTION_COMMISSION_PERCENT"];
      if (percentKeys.includes(setting.key) && setting.value) {
        const numericValue = parseFloat(setting.value);
        if (!isNaN(numericValue)) {
          return { ...setting, value: (numericValue / 100).toString() }; // "5" -> "0.05"
        }
      }

      // 2. Logic for CURRENCY keys (VND)
      const currencyKeys = [
        "verification_fee",
        "AUCTION_PARTICIPATION_FEE",
        "dealer_subscription",
      ];
      if (currencyKeys.includes(setting.key) && setting.value) {
        const rawValue = setting.value.replace(/\D/g, ""); // "10.000.000" -> "10000000"
        return { ...setting, value: rawValue };
      }

      return setting;
    });
    // === END TRANSFORMATION LOGIC ===

    const { data: updatedSettings, error } = await supabaseAdmin
      .from("app_settings")
      .upsert(transformedSettings)
      .select();

    if (error) {
      console.error("API Admin/Settings: Upsert DB Error:", error);
      throw error;
    }

    return NextResponse.json(
      { settings: updatedSettings, message: "Settings updated successfully!" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("API Admin/Settings: Unexpected Error (PATCH):", error);
    let message = "Server error while updating settings.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
