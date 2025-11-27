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
  "dealer_subscription",
];

// Các key cần xử lý đặc biệt
const PERCENT_KEYS = ["TRANSACTION_COMMISSION_PERCENT"];
const CURRENCY_KEYS = [
  "AUCTION_PARTICIPATION_FEE",
  "verification_fee",
  "dealer_subscription",
];

// Helper: Format tiền tệ (VD: 10000 -> 10.000)
const formatCurrencyInput = (val: string | number | null): string => {
  if (!val) return "";
  const strVal = val.toString().replace(/\D/g, "");
  const number = parseInt(strVal, 10);
  if (isNaN(number)) return "";
  return new Intl.NumberFormat("vi-VN").format(number);
};

// Helper: Format label sang tiếng Anh cho đẹp
const getLabel = (key: string) => {
  switch (key) {
    case "BANK_ID":
      return "Bank Name / ID (e.g. MB, VCB)";
    case "ACCOUNT_NO":
      return "Account Number";
    case "ACCOUNT_NAME":
      return "Account Name";
    case "QR_TEMPLATE":
      return "QR Template (e.g. compact2)";
    case "TRANSACTION_COMMISSION_PERCENT":
      return "Transaction Fee (%)";
    case "AUCTION_PARTICIPATION_FEE":
      return "Auction Join Fee (VND)";
    case "verification_fee":
      return "User Verification Fee (VND)";
    case "dealer_subscription":
      return "Dealer Upgrade Fee (VND)";
    default:
      return key;
  }
};

const getDescription = (key: string) => {
  switch (key) {
    case "TRANSACTION_COMMISSION_PERCENT":
      return "Percentage taken from seller per successful order.";
    case "AUCTION_PARTICIPATION_FEE":
      return "Fee deducted from user wallet to join an auction.";
    case "verification_fee":
      return "Fee to get the 'Verified' badge.";
    case "dealer_subscription":
      return "Fee to upgrade account to 'Dealer' role.";
    case "QR_TEMPLATE":
      return "Template style for VietQR (print, compact, etc).";
    default:
      return "";
  }
};

// === 1. TÁCH COMPONENT SettingRow RA NGOÀI (Tránh mất focus) ===
interface SettingRowProps {
  item: AppSetting;
  onSave: (key: string, value: string | null) => void;
  onChange: (key: string, newValue: string) => void;
  isSaving: boolean;
}

const SettingRow = ({ item, onSave, onChange, isSaving }: SettingRowProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end md:items-center p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
      <div className="md:col-span-4 space-y-1">
        <Label className="font-bold text-base">{getLabel(item.key)}</Label>
        <p className="text-xs text-muted-foreground">
          {getDescription(item.key) || item.description}
        </p>
      </div>
      <div className="md:col-span-6">
        <Input
          value={item.value || ""}
          onChange={(e) => onChange(item.key, e.target.value)}
          className="font-medium"
          placeholder={
            item.key === "QR_TEMPLATE" ? "compact2" : "Enter value..."
          }
        />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button
          onClick={() => onSave(item.key, item.value)}
          disabled={isSaving}
          size="sm"
          className="w-full md:w-auto"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// === 2. COMPONENT CHÍNH ===
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

      // Xử lý dữ liệu trước khi hiển thị (Format tiền & %)
      const rawSettings: AppSetting[] = data.settings || [];
      const formattedSettings = rawSettings.map((s) => {
        // Nếu là %, nhân 100 để hiển thị (0.05 -> 5)
        if (PERCENT_KEYS.includes(s.key) && s.value) {
          const val = parseFloat(s.value);
          return { ...s, value: isNaN(val) ? s.value : (val * 100).toString() };
        }
        // Nếu là tiền, format dấu chấm (50000 -> 50.000)
        if (CURRENCY_KEYS.includes(s.key) && s.value) {
          return { ...s, value: formatCurrencyInput(s.value) };
        }
        return s;
      });

      setSettings(formattedSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Xử lý thay đổi giá trị input
  const handleChange = (key: string, newValue: string) => {
    let processedValue = newValue;

    // Nếu là ô tiền tệ, format ngay khi gõ
    if (CURRENCY_KEYS.includes(key)) {
      processedValue = formatCurrencyInput(newValue);
    }
    // Nếu là ô phần trăm, chỉ cho nhập số
    if (PERCENT_KEYS.includes(key)) {
      // Cho phép nhập số thập phân nhưng thường % là số nguyên
      // processedValue = newValue.replace(/[^0-9.]/g, "");
    }

    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: processedValue } : s))
    );
  };

  // Xử lý lưu từng setting
  const handleSave = async (key: string, value: string | null) => {
    setSavingKey(key);
    try {
      // Lưu ý: API PATCH của chúng ta đã có logic tự động:
      // - Nếu key là PERCENT -> Chia 100
      // - Nếu key là CURRENCY -> Bỏ dấu chấm (replace non-digits)
      // Nên ở đây ta cứ gửi value y nguyên như trên UI
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ key, value }]),
      });

      if (!res.ok) throw new Error("Save failed");

      // alert("Saved successfully!");
    } catch (error) {
      alert("Failed to save setting!");
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
          <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground">
            Manage global configurations and fees.
          </p>
        </div>
        <Button variant="outline" onClick={fetchSettings}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* === GROUP 1: BANKING === */}
      {bankSettings.length > 0 && (
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="bg-blue-50/50 pb-4">
            <div className="flex items-center gap-2 text-blue-700">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Bank Account & QR</CardTitle>
            </div>
            <CardDescription>
              Configuration for the Admin receiving account (Deposit).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {bankSettings.map((item) => (
              <SettingRow
                key={item.key}
                item={item}
                onChange={handleChange}
                onSave={handleSave}
                isSaving={savingKey === item.key}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* === GROUP 2: FEES === */}
      {feeSettings.length > 0 && (
        <Card className="border-green-100 shadow-sm">
          <CardHeader className="bg-green-50/50 pb-4">
            <div className="flex items-center gap-2 text-green-700">
              <Percent className="h-5 w-5" />
              <CardTitle>Fees & Commissions Configuration</CardTitle>
            </div>
            <CardDescription>
              Set transaction fees, auction fees, and membership costs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {feeSettings.map((item) => (
              <SettingRow
                key={item.key}
                item={item}
                onChange={handleChange}
                onSave={handleSave}
                isSaving={savingKey === item.key}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* === GROUP 3: OTHERS === */}
      {otherSettings.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Settings2 className="h-5 w-5" />
              <CardTitle>Other Settings</CardTitle>
            </div>
            <CardDescription>Miscellaneous system parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {otherSettings.map((item) => (
              <SettingRow
                key={item.key}
                item={item}
                onChange={handleChange}
                onSave={handleSave}
                isSaving={savingKey === item.key}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
