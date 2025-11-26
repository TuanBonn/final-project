// src/components/LogoutButton.tsx
"use client";

// KHÔNG cần import createClient nữa
// import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button"; // Đảm bảo bạn đã cài đặt: npx shadcn-ui@latest add button

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Gọi API đăng xuất bạn đã tạo
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Đăng xuất không thành công.");
      }

      // Đăng xuất thành công
      console.log("Đăng xuất thành công từ client."); // Log để debug
      router.replace("/"); // Về trang chủ
      router.refresh(); // Làm mới trang để cập nhật UI (Header sẽ nhận lại user là null)
    } catch (error: unknown) {
      console.error("Lỗi khi đăng xuất:", error);
      let errorMessage = "Đã xảy ra lỗi.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert("Lỗi đăng xuất: " + errorMessage);
    }
  };

  return (
    <Button variant="destructive" onClick={handleLogout}>
      Đăng xuất
    </Button>
  );
}
