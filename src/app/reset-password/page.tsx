// src/app/reset-password/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success">("idle");

  useEffect(() => {
    if (!token) {
      // Logic check token...
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password is too short.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed");

      setStatus("success");
      setTimeout(() => router.push("/login"), 3000);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md shadow-lg mx-auto">
        <CardContent className="pt-6 text-center">
          <p className="text-red-500">Invalid or expired link.</p>
          <Button
            variant="link"
            onClick={() => router.push("/forgot-password")}
          >
            Request Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold">Reset New Password</CardTitle>
        <CardDescription>
          Enter a new password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "success" ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h3 className="text-lg font-bold text-green-700">Success!</h3>
            <p className="text-muted-foreground">
              Your password has been updated. Redirecting to login page...
            </p>
            <Button onClick={() => router.push("/login")} variant="outline">
              Login Now
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pass">New Password</Label>
              <Input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="******"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pass">Confirm Password</Label>
              <Input
                id="confirm-pass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="******"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Save New Password"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
