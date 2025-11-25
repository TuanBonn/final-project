// src/app/admin/settings/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Save,
  RefreshCcw,
  CreditCard,
  Percent,
  Settings2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Định nghĩa kiểu dữ liệu Setting
interface AppSetting {
  key: string;
  value: string | null;
  description: string | null;
}

// === CẤU HÌNH NHÓM (KEY MAPPING) ===
const BANK_KEYS = ["BANK_ID", "ACCOUNT_NO", "ACCOUNT_NAME", "QR_TEMPLATE"];
const FEE_KEYS = [
  "TRANSACTION_COMMISSION_PERCENT",
  "AUCTION_PARTICIPATION_FEE",
  "verification_fee",
];
// ===================================

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Fetch dữ liệu
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      setSettings(data.settings || []);
    } catch (error) {
      console.error("Lỗi tải settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Xử lý thay đổi giá trị input
  const handleChange = (key: string, newValue: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: newValue } : s))
    );
  };

  // Xử lý lưu từng setting
  const handleSave = async (key: string, value: string | null) => {
    setSavingKey(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", // Hoặc POST tùy API của bạn
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });

      if (!res.ok) throw new Error("Lỗi lưu setting");

      // Tùy chọn: alert("Đã lưu!");
    } catch (error) {
      alert("Lưu thất bại!");
    } finally {
      setSavingKey(null);
    }
  };

  // === LOGIC PHÂN NHÓM SETTINGS ===
  const bankSettings = settings.filter((s) => BANK_KEYS.includes(s.key));
  const feeSettings = settings.filter((s) => FEE_KEYS.includes(s.key));
  const otherSettings = settings.filter(
    (s) => !BANK_KEYS.includes(s.key) && !FEE_KEYS.includes(s.key)
  );

  // Component con để render từng dòng Setting
  const SettingRow = ({ item }: { item: AppSetting }) => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end md:items-center p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
      <div className="md:col-span-4 space-y-1">
        <Label className="font-bold text-base">{item.key}</Label>
        <p className="text-xs text-muted-foreground">{item.description}</p>
      </div>
      <div className="md:col-span-6">
        <Input
          value={item.value || ""}
          onChange={(e) => handleChange(item.key, e.target.value)}
          className="font-medium"
        />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button
          onClick={() => handleSave(item.key, item.value)}
          disabled={savingKey === item.key}
          size="sm"
          className="w-full md:w-auto"
        >
          {savingKey === item.key ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Lưu
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Cài đặt Hệ thống
          </h2>
          <p className="text-muted-foreground">
            Quản lý các tham số vận hành của sàn giao dịch.
          </p>
        </div>
        <Button variant="outline" onClick={fetchSettings}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Tải lại
        </Button>
      </div>

      {/* === NHÓM 1: NGÂN HÀNG === */}
      {bankSettings.length > 0 && (
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="bg-blue-50/50 pb-4">
            <div className="flex items-center gap-2 text-blue-700">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Thông tin Ngân hàng & QR</CardTitle>
            </div>
            <CardDescription>
              Cấu hình tài khoản nhận tiền mặc định của Admin (hiển thị khi user
              nạp tiền).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {bankSettings.map((item) => (
              <SettingRow key={item.key} item={item} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* === NHÓM 2: PHÍ & HOA HỒNG === */}
      {feeSettings.length > 0 && (
        <Card className="border-green-100 shadow-sm">
          <CardHeader className="bg-green-50/50 pb-4">
            <div className="flex items-center gap-2 text-green-700">
              <Percent className="h-5 w-5" />
              <CardTitle>Cấu hình Phí & Hoa hồng</CardTitle>
            </div>
            <CardDescription>
              Điều chỉnh các mức phí giao dịch, phí cọc và phí xác thực.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {feeSettings.map((item) => (
              <SettingRow key={item.key} item={item} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* === NHÓM 3: KHÁC === */}
      {otherSettings.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Settings2 className="h-5 w-5" />
              <CardTitle>Cài đặt Khác</CardTitle>
            </div>
            <CardDescription>Các tham số cấu hình chung khác.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {otherSettings.map((item) => (
              <SettingRow key={item.key} item={item} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
