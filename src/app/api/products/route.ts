// // src/app/api/products/route.ts

// import { NextResponse } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import { parse as parseCookie } from "cookie";
// import jwt from "jsonwebtoken";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// // client public để GET
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

// interface JwtPayload {
//   userId: string;
//   [key: string]: unknown;
// }

// const JWT_SECRET = process.env.JWT_SECRET;
// const COOKIE_NAME = "auth-token";

// function getSupabaseAdmin(): SupabaseClient | null {
//   if (!supabaseUrl || !supabaseServiceKey) return null;
//   return createClient(supabaseUrl, supabaseServiceKey, {
//     auth: { persistSession: false },
//   });
// }

// // ================== GET ==================
// export async function GET(request: Request) {
//   try {
//     const url = new URL(request.url);
//     const params = url.searchParams;

//     const sort = params.get("sort") || "created_at_desc";
//     const filterVerified = params.get("verified") === "true";
//     const filterConditions = params.getAll("condition");
//     const filterBrandIds = params.getAll("brand_id");
//     const limit = 100;

//     // dùng users!seller_id!inner để có thể .eq("seller.is_verified", true)
//     let query = supabase
//       .from("products")
//       .select(
//         `
//         id,
//         name,
//         price,
//         condition,
//         image_urls,
//         created_at,
//         brand_id,
//         seller:users!seller_id!inner (
//           username,
//           avatar_url,
//           is_verified
//         ),
//         brand:brands (
//           id,
//           name
//         )
//       `
//       )
//       .eq("status", "available");

//     // lọc theo condition (cột trên products)
//     if (filterConditions.length > 0) {
//       query = query.in("condition", filterConditions);
//     }

//     // lọc theo brand_id (cột trên products)
//     if (filterBrandIds.length > 0) {
//       query = query.in("brand_id", filterBrandIds);
//     }

//     // chỉ hiển thị người bán verified
//     if (filterVerified) {
//       query = query.eq("seller.is_verified", true);
//     }

//     // sắp xếp — KHÔNG còn "verified_first"
//     if (sort === "price_asc") {
//       query = query.order("price", { ascending: true });
//     } else if (sort === "price_desc") {
//       query = query.order("price", { ascending: false });
//     } else {
//       // mặc định: mới nhất
//       query = query.order("created_at", { ascending: false });
//     }

//     query = query.limit(limit);

//     const { data: products, error } = await query;

//     if (error) {
//       console.error("API GET /products:", error);
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     return NextResponse.json({ products: products ?? [] }, { status: 200 });
//   } catch (err: any) {
//     console.error("API GET /products: Lỗi bất ngờ:", err);
//     return NextResponse.json(
//       { error: "Lỗi server khi lấy sản phẩm." },
//       { status: 500 }
//     );
//   }
// }
// // ================== HẾT GET ==================

// // ================== POST (giữ logic của bạn) ==================
// export async function POST(request: Request) {
//   console.log("API POST /products: Bắt đầu xử lý đăng sản phẩm...");
//   if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
//     console.error("API POST /products: Thiếu cấu hình .env");
//     return NextResponse.json(
//       { error: "Lỗi cấu hình server." },
//       { status: 500 }
//     );
//   }

//   // xác thực user
//   let userId: string | null;
//   try {
//     let token: string | undefined = undefined;
//     const cookieHeader = request.headers.get("cookie");
//     if (cookieHeader) {
//       const cookies = parseCookie(cookieHeader);
//       token = cookies[COOKIE_NAME];
//     }
//     if (!JWT_SECRET) throw new Error("JWT_SECRET missing");
//     const payload = jwt.verify(token || "", JWT_SECRET) as JwtPayload;
//     userId = payload.userId;
//     if (!userId) {
//       return NextResponse.json(
//         { error: "Yêu cầu đăng nhập để đăng bán." },
//         { status: 401 }
//       );
//     }
//   } catch (error: unknown) {
//     return NextResponse.json({ error: "Xác thực thất bại." }, { status: 401 });
//   }

//   try {
//     const supabaseAdmin = getSupabaseAdmin();
//     if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

//     const body = await request.json();
//     const { name, description, price, brand_id, condition, imageUrls } = body;

//     if (
//       !name ||
//       !price ||
//       !condition ||
//       !imageUrls ||
//       imageUrls.length === 0 ||
//       !brand_id
//     ) {
//       return NextResponse.json(
//         {
//           error: "Thiếu thông tin bắt buộc (Tên, Giá, Brand, Tình trạng, Ảnh).",
//         },
//         { status: 400 }
//       );
//     }

//     const { data, error: insertError } = await supabaseAdmin
//       .from("products")
//       .insert({
//         seller_id: userId,
//         name,
//         description,
//         price: price.toString().replace(/\D/g, ""),
//         brand_id,
//         condition,
//         image_urls: imageUrls,
//         status: "available",
//       })
//       .select()
//       .single();

//     if (insertError) {
//       console.error("API POST /products: Lỗi chèn DB:", insertError);
//       throw insertError;
//     }

//     return NextResponse.json(
//       { product: data, message: "Đăng bán thành công!" },
//       { status: 201 }
//     );
//   } catch (error: any) {
//     console.error("API POST /products: Lỗi bất ngờ:", error);
//     return NextResponse.json(
//       { error: error.message || "Lỗi server khi đăng bán." },
//       { status: 500 }
//     );
//   }
// }

// src/app/api/products/route.ts

import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

// --- Cấu hình ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// QUAN TRỌNG: Dùng Service Key cho cả GET và POST để bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

interface JwtPayload {
  userId: string;
  [key: string]: unknown;
}

// Hàm khởi tạo Admin Client (Quyền tối cao)
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

// ================== HÀM GET (LẤY SẢN PHẨM) ==================
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    const sort = params.get("sort") || "created_at_desc";
    const filterVerified = params.get("verified") === "true";
    const filterConditions = params.getAll("condition");
    const filterBrandIds = params.getAll("brand_id");
    const limit = 100;

    // 1. Khởi tạo Admin Client
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Lỗi cấu hình server (Admin Client)." },
        { status: 500 }
      );
    }

    // 2. Tạo Query
    // LƯU Ý QUAN TRỌNG: Thêm '!inner' vào seller để sửa lỗi lọc Verified
    let query = supabaseAdmin
      .from("products")
      .select(
        `
        id,
        name,
        price,
        condition,
        image_urls,
        created_at,
        brand_id,
        seller:users!seller_id!inner (
          username,
          avatar_url,
          is_verified
        ),
        brand:brands (
          id,
          name
        )
      `
      )
      .eq("status", "available");

    // 3. Áp dụng bộ lọc

    // Lọc theo Tình trạng
    if (filterConditions.length > 0) {
      query = query.in("condition", filterConditions);
    }

    // Lọc theo Hãng xe
    if (filterBrandIds.length > 0) {
      query = query.in("brand_id", filterBrandIds);
    }

    // Lọc theo Verified
    if (filterVerified) {
      query = query.eq("seller.is_verified", true);
    }

    // 4. Sắp xếp
    if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else {
      // Mặc định: Mới nhất
      query = query.order("created_at", { ascending: false });
    }

    // Giới hạn số lượng
    query = query.limit(limit);

    // 5. Thực thi Query
    const { data: products, error } = await query;

    if (error) {
      console.error("API GET /products Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: products ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error("API GET /products: Lỗi bất ngờ:", err);
    return NextResponse.json(
      { error: "Lỗi server khi lấy sản phẩm." },
      { status: 500 }
    );
  }
}

// ================== HÀM POST (ĐĂNG SẢN PHẨM) ==================
export async function POST(request: Request) {
  // console.log("API POST /products: Bắt đầu xử lý...");

  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Lỗi cấu hình server." },
      { status: 500 }
    );
  }

  // 1. Xác thực User qua Cookie
  let userId: string | null = null;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      const token = cookies[COOKIE_NAME];
      if (token) {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        userId = payload.userId;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Yêu cầu đăng nhập để đăng bán." },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Phiên đăng nhập không hợp lệ." },
      { status: 401 }
    );
  }

  // 2. Xử lý dữ liệu và Insert
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

    const body = await request.json();
    const { name, description, price, brand_id, condition, imageUrls } = body;

    // Validate cơ bản
    if (
      !name ||
      !price ||
      !condition ||
      !imageUrls ||
      imageUrls.length === 0 ||
      !brand_id
    ) {
      return NextResponse.json(
        {
          error: "Thiếu thông tin bắt buộc (Tên, Giá, Brand, Tình trạng, Ảnh).",
        },
        { status: 400 }
      );
    }

    // Insert vào DB
    const { data, error: insertError } = await supabaseAdmin
      .from("products")
      .insert({
        seller_id: userId,
        name,
        description,
        price: price.toString().replace(/\D/g, ""), // Xóa ký tự không phải số
        brand_id,
        condition,
        image_urls: imageUrls,
        status: "available",
        // id và created_at sẽ được DB tự sinh
      })
      .select()
      .single();

    if (insertError) {
      console.error("API POST /products: Lỗi chèn DB:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      { product: data, message: "Đăng bán thành công!" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API POST /products: Lỗi bất ngờ:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi server khi đăng bán." },
      { status: 500 }
    );
  }
}
