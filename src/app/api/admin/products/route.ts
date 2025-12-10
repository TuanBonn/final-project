// // src/app/api/admin/products/route.ts
// import { NextResponse, type NextRequest } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import { parse as parseCookie } from "cookie";
// import jwt from "jsonwebtoken";

// export const runtime = "nodejs";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const JWT_SECRET = process.env.JWT_SECRET;
// const COOKIE_NAME = "auth-token";

// interface JwtPayload {
//   role?: string;
//   [key: string]: unknown;
// }

// function getSupabaseAdmin(): SupabaseClient | null {
//   if (!supabaseUrl || !supabaseServiceKey) return null;
//   return createClient(supabaseUrl, supabaseServiceKey, {
//     auth: { persistSession: false },
//   });
// }

// async function verifyAdmin(request: NextRequest): Promise<boolean> {
//   if (!JWT_SECRET) return false;
//   try {
//     let token: string | undefined;
//     const cookieHeader = request.headers.get("cookie");
//     if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
//     if (!token) return false;
//     const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
//     return decoded.role === "admin";
//   } catch {
//     return false;
//   }
// }

// export async function GET(request: NextRequest) {
//   if (!(await verifyAdmin(request))) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
//   }

//   try {
//     const supabaseAdmin = getSupabaseAdmin();
//     if (!supabaseAdmin) throw new Error("Admin Client Error");

//     const { searchParams } = new URL(request.url);
//     const page = parseInt(searchParams.get("page") || "1");
//     const limit = parseInt(searchParams.get("limit") || "10");
//     const search = searchParams.get("search") || "";

//     const from = (page - 1) * limit;
//     const to = from + limit - 1;

//     let query = supabaseAdmin
//       .from("products")
//       .select("*, seller:users!seller_id(username)", { count: "exact" });

//     // === LOGIC TÌM KIẾM MỚI ===
//     if (search) {
//       // 1. Tìm Seller ID có username trùng khớp
//       const { data: sellers } = await supabaseAdmin
//         .from("users")
//         .select("id")
//         .ilike("username", `%${search}%`);

//       const sellerIds = sellers?.map((u) => u.id) || [];

//       // 2. Tạo điều kiện OR: (Tên sản phẩm LIKE search) HOẶC (Seller ID nằm trong list tìm được)
//       const conditions = [`name.ilike.%${search}%`];
//       if (sellerIds.length > 0) {
//         conditions.push(`seller_id.in.(${sellerIds.join(",")})`);
//       }

//       query = query.or(conditions.join(","));
//     }
//     // ==========================

//     query = query.order("created_at", { ascending: false }).range(from, to);

//     const { data: products, error, count } = await query;

//     if (error) throw error;

//     const totalPages = count ? Math.ceil(count / limit) : 1;

//     return NextResponse.json(
//       { products, totalPages, currentPage: page, totalItems: count },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// src/app/api/admin/products/route.ts
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
    let token: string | undefined;
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Admin Client Error");

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // OPTIMIZATION 1: Select only necessary columns
    // Avoid selecting 'description' or heavy JSON columns to reduce payload size
    let query = supabaseAdmin
      .from("products")
      .select(
        "id, name, price, quantity, status, created_at, image_urls, seller_id, seller:users!seller_id(username)",
        { count: "exact" }
      );

    // === OPTIMIZED SEARCH LOGIC ===
    if (search) {
      // 1. Find Seller IDs matching username
      // OPTIMIZATION 2: Limit the number of users to check to prevent "Statement Timeout"
      // If a search term matches 1000 users, passing 1000 IDs to the product query kills performance.
      const { data: sellers } = await supabaseAdmin
        .from("users")
        .select("id")
        .ilike("username", `%${search}%`)
        .limit(50); // Hard limit to keep the query fast

      const sellerIds = sellers?.map((u) => u.id) || [];

      // 2. Create OR condition: (Product Name LIKE search) OR (Seller ID IN list)
      const conditions = [`name.ilike.%${search}%`];

      // Only add seller condition if we found relevant sellers
      if (sellerIds.length > 0) {
        conditions.push(`seller_id.in.(${sellerIds.join(",")})`);
      }

      query = query.or(conditions.join(","));
    }
    // ==============================

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data: products, error, count } = await query;

    if (error) throw error;

    const totalPages = count ? Math.ceil(count / limit) : 1;

    return NextResponse.json(
      { products, totalPages, currentPage: page, totalItems: count },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Admin Product Fetch Error:", error); // Log for debugging
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
