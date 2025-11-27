// src/app/wallet/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCcw,
  QrCode,
  ShoppingBag,
} from "lucide-react";
import { PaymentStatus, PaymentForType } from "@prisma/client";

interface SystemBankInfo {
  bankId: string;
  accountNo: string;
  accountName: string;
  template: string;
}

interface PaymentHistory {
  id: string;
  amount: number;
  payment_for_type: PaymentForType;
  status: PaymentStatus;
  created_at: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

// Helper xác định loại giao dịch là TRỪ TIỀN (SỬA LẠI Ở ĐÂY)
const isNegativeTransaction = (type: string) => {
  return (
    type === "withdrawal" ||
    type === "group_buy_order" ||
    type.includes("fee") ||
    type === "auction_bid_fee" ||
    type === "transaction_commission" ||
    type === "dealer_subscription" || // <--- ĐÃ THÊM: Phí Dealer là trừ tiền
    type === "verification_fee" // <--- ĐÃ THÊM: Phí Verify là trừ tiền
  );
};

// Helper lấy Label (SỬA LẠI Ở ĐÂY)
const getPaymentLabel = (type: string) => {
  switch (type) {
    case "deposit":
      return "Nạp tiền";
    case "withdrawal":
      return "Rút tiền";
    case "group_buy_order":
      return "Đặt cọc Mua chung";
    case "group_buy_refund":
      return "Hoàn tiền Mua chung";
    case "group_buy_payout":
      return "Doanh thu Mua chung";
    case "auction_creation_fee":
      return "Phí tạo đấu giá";
    case "auction_bid_fee":
      return "Phí tham gia đấu giá";
    case "transaction_commission":
      return "Phí sàn (Hoa hồng)";
    // === THÊM NHÃN TIẾNG VIỆT ===
    case "dealer_subscription":
      return "Nâng cấp Dealer";
    case "verification_fee":
      return "Phí xác thực tài khoản";
    // ============================
    default:
      return type.replace(/_/g, " ");
  }
};

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemBankInfo, setSystemBankInfo] = useState<SystemBankInfo | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"deposit" | "withdrawal">(
    "deposit"
  );
  const [amountInput, setAmountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [savedBankInfo, setSavedBankInfo] = useState<any>(null);

  const fetchWalletData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet");
      if (!res.ok) throw new Error("Failed to fetch wallet");
      const data = await res.json();
      setBalance(data.balance);
      setHistory(data.history);
      setSavedBankInfo(data.bankInfo);
      if (data.systemBankInfo) {
        setSystemBankInfo(data.systemBankInfo);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const generateQR = () => {
    const amount = parseInt(amountInput.replace(/\D/g, ""), 10);
    if (!amount || amount < 10000) {
      alert("Số tiền tối thiểu là 10.000đ");
      setQrCodeUrl(null);
      return;
    }
    if (!systemBankInfo) {
      alert("Chưa có thông tin tài khoản hệ thống.");
      return;
    }
    const { bankId, accountNo, accountName, template } = systemBankInfo;
    const addInfo = `NAPTIEN W${Math.floor(Math.random() * 10000)}`;
    const url = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${addInfo}&accountName=${encodeURIComponent(
      accountName
    )}`;
    setQrCodeUrl(url);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    const numVal = parseInt(val || "0");
    setAmountInput(new Intl.NumberFormat("vi-VN").format(numVal));
    if (qrCodeUrl) setQrCodeUrl(null);
  };

  const handleTransaction = async () => {
    const amount = parseInt(amountInput.replace(/\D/g, ""), 10);
    if (!amount || amount < 10000) {
      alert("Số tiền tối thiểu là 10,000đ");
      return;
    }
    if (actionType === "withdrawal") {
      if (!bankName || !accountNo || !accountName) {
        alert("Vui lòng nhập đầy đủ thông tin ngân hàng.");
        return;
      }
    } else if (actionType === "deposit") {
      if (!qrCodeUrl) {
        alert("Vui lòng bấm 'Tạo mã QR' trước.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: actionType,
          amount,
          bankInfo:
            actionType === "withdrawal"
              ? { bankName, accountNo, accountName }
              : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Giao dịch thất bại");

      alert(
        actionType === "deposit"
          ? "Đã tạo lệnh nạp tiền!"
          : "Đã gửi yêu cầu rút tiền."
      );
      setDialogOpen(false);
      setAmountInput("");
      setQrCodeUrl(null);
      fetchWalletData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDialog = (type: "deposit" | "withdrawal") => {
    setActionType(type);
    setAmountInput("");
    setQrCodeUrl(null);
    if (type === "withdrawal" && savedBankInfo) {
      setBankName(savedBankInfo.bankName || "");
      setAccountNo(savedBankInfo.accountNo || "");
      setAccountName(savedBankInfo.accountName || "");
    } else {
      setBankName("");
      setAccountNo("");
      setAccountName("");
    }
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-xl">
        <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-slate-300 font-medium mb-1 flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Số dư khả dụng
            </p>
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <h1 className="text-4xl font-bold tracking-tight">
                {formatCurrency(balance)}
              </h1>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => openDialog("deposit")}
              className="bg-green-600 hover:bg-green-700 text-white border-none font-semibold shadow-md"
              size="lg"
            >
              <ArrowDownCircle className="mr-2 h-5 w-5" /> Nạp tiền
            </Button>
            <Button
              onClick={() => openDialog("withdrawal")}
              variant="secondary"
              size="lg"
              className="font-semibold shadow-md"
            >
              <ArrowUpCircle className="mr-2 h-5 w-5" /> Rút tiền
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lịch sử giao dịch</CardTitle>
            <CardDescription>Theo dõi biến động số dư của bạn.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchWalletData}>
            <RefreshCcw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại giao dịch</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && !loading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Chưa có giao dịch nào.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => {
                  const isNegative = isNegativeTransaction(
                    item.payment_for_type
                  );
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.payment_for_type.includes("group_buy") ? (
                            <ShoppingBag className="h-4 w-4 text-orange-600" />
                          ) : null}
                          {getPaymentLabel(item.payment_for_type)}
                        </div>
                      </TableCell>
                      <TableCell
                        className={`font-mono font-bold ${
                          isNegative ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {isNegative ? "-" : "+"}
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "succeeded"
                              ? "default"
                              : item.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                          className={
                            item.status === "succeeded"
                              ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                              : ""
                          }
                        >
                          {item.status === "succeeded"
                            ? "Thành công"
                            : item.status === "pending"
                            ? "Đang xử lý"
                            : "Thất bại"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Nạp/Rút (Giữ nguyên logic cũ) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={
            actionType === "deposit" && qrCodeUrl
              ? "sm:max-w-lg"
              : "sm:max-w-md"
          }
        >
          <DialogHeader>
            <DialogTitle>
              {actionType === "deposit"
                ? "Nạp tiền vào ví"
                : "Rút tiền về tài khoản"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "deposit"
                ? "Nhập số tiền, sau đó bấm tạo mã QR."
                : "Nhập số tiền và thông tin nhận tiền."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex gap-2 items-end">
              <div className="space-y-2 flex-1">
                <Label>Số tiền (VND)</Label>
                <Input
                  placeholder="Ví dụ: 500.000"
                  value={amountInput}
                  onChange={handleAmountChange}
                  className="font-bold text-lg"
                  autoFocus
                />
              </div>
              {actionType === "deposit" && (
                <Button
                  onClick={generateQR}
                  type="button"
                  variant={qrCodeUrl ? "outline" : "default"}
                  className="mb-[2px]"
                >
                  <QrCode className="mr-2 h-4 w-4" />{" "}
                  {qrCodeUrl ? "Tạo lại QR" : "Tạo mã QR"}
                </Button>
              )}
            </div>
            {actionType === "deposit" && qrCodeUrl && systemBankInfo && (
              <div className="mt-4 border rounded-lg p-4 bg-muted/20 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <p className="text-sm font-medium mb-3 flex items-center gap-2 text-blue-600">
                  Quét mã để chuyển khoản
                </p>
                <div className="relative w-full aspect-square max-w-[280px] bg-white p-2 rounded-md shadow-sm">
                  <Image
                    src={qrCodeUrl}
                    alt="VietQR"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="mt-4 w-full space-y-2 bg-white p-3 rounded border text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Ngân hàng:</span>
                    <span className="font-semibold">
                      {systemBankInfo.bankId}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Số tài khoản:</span>
                    <span className="font-semibold">
                      {systemBankInfo.accountNo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Chủ tài khoản:
                    </span>
                    <span className="font-semibold">
                      {systemBankInfo.accountName}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center bg-yellow-50 p-2 rounded border border-yellow-100 text-yellow-800">
                  ⚠️ Lưu ý: Vui lòng{" "}
                  <strong>giữ nguyên nội dung chuyển khoản</strong> để được
                  duyệt nhanh nhất.
                </p>
              </div>
            )}
            {actionType === "withdrawal" && (
              <div className="space-y-4 border-t pt-4 mt-2">
                <div className="space-y-2">
                  <Label>Ngân hàng thụ hưởng</Label>
                  <Input
                    placeholder="Ví dụ: MB Bank, Vietcombank..."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số tài khoản</Label>
                  <Input
                    placeholder="Nhập số tài khoản..."
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên chủ tài khoản (Viết hoa)</Label>
                  <Input
                    placeholder="NGUYEN VAN A"
                    value={accountName}
                    onChange={(e) =>
                      setAccountName(e.target.value.toUpperCase())
                    }
                  />
                </div>
                <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800 border border-yellow-200 flex items-start gap-2">
                  <span className="text-lg">ℹ️</span>
                  <span>
                    Lưu ý: Phí rút tiền là 0%. Thời gian xử lý từ 2-24h làm
                    việc.
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleTransaction}
              disabled={
                isSubmitting || (actionType === "deposit" && !qrCodeUrl)
              }
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}{" "}
              {actionType === "deposit" ? "Đã chuyển khoản" : "Gửi yêu cầu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
