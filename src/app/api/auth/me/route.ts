// src/app/api/auth/me/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
// Import Supabase SSR functions directly
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Ensure this matches the name used in login/logout APIs
const COOKIE_NAME = "auth-token";
const JWT_SECRET = process.env.JWT_SECRET;

// Define the expected structure of the JWT payload
interface JwtPayload {
  userId: string;
  email: string; // Include other data stored in the token if any
}

export async function GET(request: Request) {
  // console.log("Attempting GET /api/auth/me"); // Optional: Log start
  if (!JWT_SECRET) {
    console.error("API /me: JWT_SECRET is not configured in .env file!");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }

  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  // console.log("API /me: Token from cookie:", token); // Optional: Log token

  if (!token) {
    // console.log("API /me: No token found, returning null user"); // Optional: Log no token
    // No token means the user is not logged in
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    // 1. Verify the JWT signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // console.log("API /me: Token decoded successfully:", decoded); // Optional: Log decoded token

    // === CREATE SUPABASE CLIENT CORRECTLY FOR API ROUTE ===
    // Needed to fetch fresh profile data from the database
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // Define the get function to read from the cookie store
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          // set/remove are not needed for a GET request that only reads
        },
      }
    );
    // =======================================================

    // 2. Fetch the user's profile from the database using the verified userId
    const { data: userProfile, error: profileError } = await supabase
      .from("users") // Make sure 'users' is your correct table name
      .select("id, email, username, full_name, avatar_url, role, is_verified")
      .eq("id", decoded.userId)
      .single(); // Expecting only one matching profile

    if (profileError) {
      console.error(
        "API /me: Error fetching profile for authenticated user:",
        profileError
      );
      // If profile fetch fails, maybe just return basic info from the token
      return NextResponse.json(
        { user: { id: decoded.userId, email: decoded.email } },
        { status: 200 }
      );
    }

    // console.log("API /me: Profile fetched successfully:", userProfile); // Optional: Log profile data
    // Return the full user profile fetched from the database
    return NextResponse.json({ user: userProfile }, { status: 200 });
  } catch (error) {
    // This block catches JWT verification errors (expired, invalid signature, etc.)
    console.error("API /me: Invalid token or other error:", error);
    // Optionally clear the invalid cookie here
    // cookieStore.set({ name: COOKIE_NAME, value: '', maxAge: 0, path: '/' });
    return NextResponse.json({ user: null }, { status: 200 }); // Treat as not logged in
  }
}
