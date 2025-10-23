// src/app/login/page.tsx
"use client"; // Đánh dấu đây là Client Component để có thể dùng hooks

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // Thêm state cho username
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Truyền username qua đây để trigger có thể lấy được
        data: {
          username: username,
        },
      },
    });

    if (error) {
      alert("Lỗi đăng ký: " + error.message);
    } else {
      alert("Đăng ký thành công! Vui lòng kiểm tra email để xác thực.");
      // Sau khi đăng ký, bạn có thể muốn họ đăng nhập
      // Hoặc chuyển hướng họ đi đâu đó
      router.push("/");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Lỗi đăng nhập: " + error.message);
    } else {
      router.push("/"); // Chuyển về trang chủ
      router.refresh(); // Làm mới trang để cập nhật trạng thái UI
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Chào mừng đến với Sàn Mô Hình</CardTitle>
          <CardDescription>Đăng nhập hoặc đăng ký để tiếp tục</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="username">
                  Tên người dùng (chỉ khi đăng ký)
                </Label>
                <Input
                  id="username"
                  placeholder="nguyenvana"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <Button onClick={handleSignIn}>Đăng nhập</Button>
              <Button variant="outline" onClick={handleSignUp}>
                Đăng ký
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
