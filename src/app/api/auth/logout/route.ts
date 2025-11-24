// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "auth-token";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    if (!cookieStore.has(COOKIE_NAME))
      return NextResponse.json({ message: "Đã đăng xuất." }, { status: 200 });

    // Xóa cookie
    cookieStore.set({
      name: COOKIE_NAME,
      value: "",
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json(
      { message: "Đăng xuất thành công." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("API Logout Error:", error);
    let message = "Lỗi server.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
