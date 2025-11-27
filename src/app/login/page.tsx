// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chrome } from "lucide-react";
import Link from "next/link"; // <--- Thêm import Link

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/contexts/UserContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const router = useRouter();
  const { fetchUserData: refetchUserContext } = useUser();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3) {
      alert("Username phải ít nhất 3 ký tự.");
      return;
    }
    if (fullName.trim() === "") {
      alert("Nhập họ tên đi chứ.");
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          username: username.trim(),
          fullName: fullName.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đăng ký thất bại.");
      alert(data.message);
    } catch (error: unknown) {
      console.error("Lỗi gọi API đăng ký:", error);
      let errorMessage = "Lỗi không xác định.";
      if (error instanceof Error) errorMessage = error.message;
      alert("Lỗi đăng ký: " + errorMessage);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đăng nhập thất bại.");

      console.log("LoginPage: Login successful, triggering context refresh.");
      await refetchUserContext();

      router.push("/");
    } catch (error: unknown) {
      console.error("Lỗi gọi API đăng nhập:", error);
      let errorMessage = "Lỗi không xác định.";
      if (error instanceof Error) errorMessage = error.message;
      alert("Lỗi đăng nhập: " + errorMessage);
    }
  };

  const handleSignInWithGoogle = async () => {
    alert("Google Sign-In sắp có...");
  };

  return (
    <div className="flex justify-center items-center min-h-screen py-12 bg-gray-50">
      <Card className="w-full max-w-md mx-4 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Chào mừng!</CardTitle>
          <CardDescription>
            Đăng nhập hoặc đăng ký để tiếp tục khám phá.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Đăng nhập</TabsTrigger>
              <TabsTrigger value="register">Đăng ký</TabsTrigger>
            </TabsList>

            {/* === LOGIN TAB CONTENT === */}
            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleSignIn}>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="login-password">Mật khẩu</Label>
                      {/* LINK QUÊN MẬT KHẨU */}
                      <Link
                        href="/forgot-password"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Quên mật khẩu?
                      </Link>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Mật khẩu của bạn"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-6">
                  Đăng nhập
                </Button>
              </form>
            </TabsContent>

            {/* === REGISTER TAB CONTENT === */}
            <TabsContent value="register" className="mt-4">
              <form onSubmit={handleSignUp}>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="reg-fullName">Họ và tên</Label>
                    <Input
                      id="reg-fullName"
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="reg-username">Tên người dùng</Label>
                    <Input
                      id="reg-username"
                      placeholder="nguyenvana (min 3 chars)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="reg-password">Mật khẩu</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Chọn mật khẩu mạnh"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-6">
                  Đăng ký
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Hoặc tiếp tục với
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignInWithGoogle}
            disabled
          >
            <Chrome className="mr-2 h-4 w-4" /> Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
