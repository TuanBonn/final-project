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

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Admin Client Error");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = supabaseAdmin
      .from("brands")
      .select("*")
      .order("name", { ascending: true });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: brands, error } = await query;

    if (error) throw error;
    return NextResponse.json({ brands: brands || [] }, { status: 200 });
  } catch (error: unknown) {
    let message = "Server Error fetching brands.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Brand name is required." },
        { status: 400 }
      );
    }
    if (name.length > 12) {
      return NextResponse.json(
        { error: "Brand name too long (Max 12 chars)." },
        { status: 400 }
      );
    }

    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(name)) {
      return NextResponse.json(
        { error: "Brand name must be alphanumeric only." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Admin Client Error");

    const { data, error } = await supabaseAdmin
      .from("brands")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Brand "${name}" already exists.` },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      { brand: data, message: "Brand created successfully!" },
      { status: 201 }
    );
  } catch (error: unknown) {
    let message = "Server Error creating brand.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
