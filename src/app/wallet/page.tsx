// src/app/wallet/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // <-- SỬA LỖI: THÊM DÒNG NÀY
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCcw,
} from "lucide-react";
import { PaymentStatus, PaymentForType } from "@prisma/client";

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

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // State cho Dialog Nạp/Rút
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"deposit" | "withdrawal">(
    "deposit"
  );
  const [amountInput, setAmountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWalletData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet");
      if (!res.ok) throw new Error("Failed to fetch wallet");
      const data = await res.json();
      setBalance(data.balance);
      setHistory(data.history);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleTransaction = async () => {
    const amount = parseInt(amountInput.replace(/\D/g, ""), 10);
    if (!amount || amount < 10000) {
      alert("Số tiền tối thiểu là 10,000đ");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: actionType, amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Giao dịch thất bại");

      alert(data.message);
      setDialogOpen(false);
      setAmountInput("");
      fetchWalletData(); // Refresh data
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDialog = (type: "deposit" | "withdrawal") => {
    setActionType(type);
    setAmountInput("");
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      {/* Card Số dư */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none">
        <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-slate-300 font-medium mb-1 flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Số dư khả dụng
            </p>
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <h1 className="text-4xl font-bold">{formatCurrency(balance)}</h1>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => openDialog("deposit")}
              className="bg-green-600 hover:bg-green-700 text-white border-none"
            >
              <ArrowDownCircle className="mr-2 h-5 w-5" /> Nạp tiền
            </Button>
            <Button
              onClick={() => openDialog("withdrawal")}
              variant="secondary"
            >
              <ArrowUpCircle className="mr-2 h-5 w-5" /> Rút tiền
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lịch sử giao dịch */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lịch sử giao dịch</CardTitle>
            <CardDescription>
              Các giao dịch nạp, rút và thanh toán phí.
            </CardDescription>
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
                    className="text-center py-8 text-muted-foreground"
                  >
                    Chưa có giao dịch nào.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium capitalize">
                      {item.payment_for_type === "deposit"
                        ? "Nạp tiền"
                        : item.payment_for_type === "withdrawal"
                        ? "Rút tiền"
                        : item.payment_for_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell
                      className={`font-mono ${
                        item.payment_for_type === "withdrawal" ||
                        item.payment_for_type.includes("fee")
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {item.payment_for_type === "withdrawal" ||
                      item.payment_for_type.includes("fee")
                        ? "-"
                        : "+"}
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
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("vi-VN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Nạp/Rút */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "deposit"
                ? "Nạp tiền vào ví"
                : "Rút tiền về tài khoản"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "deposit"
                ? "Vui lòng nhập số tiền muốn nạp. Sau đó bạn sẽ nhận được thông tin chuyển khoản."
                : "Nhập số tiền muốn rút. Admin sẽ duyệt và chuyển khoản cho bạn."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label>Số tiền (VND)</Label>
              <Input
                placeholder="Ví dụ: 500.000"
                value={amountInput}
                onChange={(e) =>
                  setAmountInput(
                    new Intl.NumberFormat("vi-VN").format(
                      parseInt(e.target.value.replace(/\D/g, "") || "0")
                    )
                  )
                }
              />
            </div>
            {actionType === "deposit" && (
              <div className="mt-4 bg-blue-50 p-3 rounded-md text-sm text-blue-800">
                <p>
                  💡 Lưu ý: Đây là tạo lệnh nạp. Sau khi bấm xác nhận, vui lòng
                  chuyển khoản đúng nội dung để Admin duyệt.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleTransaction} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
