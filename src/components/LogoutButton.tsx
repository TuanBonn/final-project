// src/components/LogoutButton.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/"); // Về trang chủ
    router.refresh(); // Làm mới để cập nhật UI
  };

  return (
    <Button variant="destructive" onClick={handleLogout}>
      Đăng xuất
    </Button>
  );
}
