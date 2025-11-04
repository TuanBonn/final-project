// src/app/admin/settings/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Save } from "lucide-react";

// Định nghĩa kiểu Setting (khớp với DB)
interface AppSetting {
  key: string;
  value: string | null;
  description: string | null;
  updated_at: string | null; // (Chỉ để đọc)
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- Hàm fetch Cài đặt ---
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Lỗi HTTP: ${response.status}`);
      }
      const data = await response.json();
      setSettings(data.settings || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch lần đầu
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // --- Hàm xử lý khi thay đổi input ---
  const handleInputChange = (key: string, newValue: string) => {
    setSettings((currentSettings) =>
      currentSettings.map((setting) =>
        setting.key === key ? { ...setting, value: newValue } : setting
      )
    );
    // Reset thông báo
    setSuccess(null);
    setError(null);
  };

  // --- Hàm xử lý khi Lưu ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Chỉ gửi đi key và value
      const payload = settings.map((s) => ({ key: s.key, value: s.value }));

      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lưu thất bại.");

      setSuccess(data.message);
      // Tải lại data mới (ví dụ: updated_at)
      fetchSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render UI ---
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error && settings.length === 0) {
    return (
      <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <AlertCircle className="h-8 w-8 text-destructive mr-3" />
        <p className="text-destructive font-medium">Lỗi: {error}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle>Cài đặt Chung</CardTitle>
          <CardDescription>
            Chỉnh sửa các tham số chung của toàn bộ website.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings.length === 0 && !error ? (
            <p className="text-muted-foreground">
              Không tìm thấy cài đặt nào (Bảng 'app_settings' đang trống?).
            </p>
          ) : (
            settings.map((setting) => (
              <div key={setting.key} className="space-y-2">
                <Label htmlFor={setting.key} className="text-base">
                  {setting.key}
                </Label>
                <Input
                  id={setting.key}
                  value={setting.value || ""}
                  onChange={(e) =>
                    handleInputChange(setting.key, e.target.value)
                  }
                  placeholder={setting.description || "Nhập giá trị..."}
                />
                <p className="text-sm text-muted-foreground">
                  {setting.description}
                </p>
              </div>
            ))
          )}
        </CardContent>
        <CardFooter className="flex justify-between items-center border-t pt-6">
          <div className="text-sm">
            {isSaving && (
              <span className="text-muted-foreground flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang lưu...
              </span>
            )}
            {error && (
              <span className="text-destructive font-medium">{error}</span>
            )}
            {success && (
              <span className="text-green-600 font-medium">{success}</span>
            )}
          </div>
          <Button type="submit" disabled={isSaving || settings.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Lưu thay đổi
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
