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
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("API Admin/Users: Missing Supabase URL or Service Key!");
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API Admin/Users: Error creating Admin Client:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!JWT_SECRET) {
    return NextResponse.json(
      { error: "Server misconfiguration." },
      { status: 500 }
    );
  }

  try {
    let token: string | undefined = undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      token = cookies[COOKIE_NAME];
    }
    if (!token)
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Failed to init Admin Client");

    let query = supabaseAdmin
      .from("users")
      .select(
        "id, username, full_name, email, role, is_verified, status, created_at",
        { count: "exact" }
      );

    if (search) {
      query = query.or(
        `username.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data: users, error, count } = await query;

    if (error) {
      console.error("API Admin/Users: DB Error:", error);
      throw error;
    }

    const totalPages = count ? Math.ceil(count / limit) : 1;

    return NextResponse.json(
      {
        users: users || [],
        totalPages,
        currentPage: page,
        totalUsers: count,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("API Admin/Users: Unexpected Error:", error);
    let message = "Server error while fetching users.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
