// src/app/admin/payments/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Eye,
  CheckCircle,
  XCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingBag,
  CreditCard,
} from "lucide-react";
import { PaymentStatus, PaymentForType } from "@prisma/client";
import Image from "next/image";

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  payment_for_type: PaymentForType;
  status: PaymentStatus;
  created_at: string;
  user: {
    username: string | null;
    email: string;
  } | null;
  withdrawal_info?: {
    bankName: string;
    accountNo: string;
    accountName: string;
  };
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

// Helper xác định loại giao dịch là TRỪ TIỀN hay CỘNG TIỀN
const isNegativeTransaction = (type: string) => {
  return (
    type === "withdrawal" ||
    type === "group_buy_order" || // Mua GroupBuy là trừ tiền
    type.includes("fee") || // Các loại phí
    type === "auction_bid_fee"
  );
};

// Helper lấy icon và màu sắc cho loại giao dịch
const getTypeInfo = (type: string) => {
  if (
    type === "deposit" ||
    type === "group_buy_refund" ||
    type === "group_buy_payout"
  ) {
    return {
      icon: ArrowDownCircle,
      color: "text-green-600",
      label: "Tiền vào",
    };
  }
  if (type === "withdrawal") {
    return { icon: ArrowUpCircle, color: "text-red-600", label: "Rút tiền" };
  }
  if (type === "group_buy_order") {
    return {
      icon: ShoppingBag,
      color: "text-orange-600",
      label: "Thanh toán Mua chung",
    };
  }
  if (type.includes("fee")) {
    return { icon: CreditCard, color: "text-gray-600", label: "Phí dịch vụ" };
  }
  return {
    icon: ArrowUpCircle,
    color: "text-gray-600",
    label: type.replace(/_/g, " "),
  };
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("all");

  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentTab !== "all") params.append("status", currentTab);

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (status: "succeeded" | "failed") => {
    if (!selectedPayment) return;

    let confirmMsg = "";
    if (selectedPayment.payment_for_type === "deposit") {
      confirmMsg =
        status === "succeeded"
          ? "Xác nhận ĐÃ NHẬN ĐƯỢC TIỀN từ khách? (Tiền sẽ cộng vào ví khách)"
          : "Xác nhận KHÔNG NHẬN ĐƯỢC TIỀN? (Hủy lệnh nạp)";
    } else {
      confirmMsg =
        status === "succeeded"
          ? "Xác nhận ĐÃ CHUYỂN KHOẢN cho khách?"
          : "Xác nhận TỪ CHỐI RÚT? (Tiền sẽ hoàn về ví khách)";
    }

    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/payments/${selectedPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Lỗi cập nhật");

      alert("Thao tác thành công!");
      setSelectedPayment(null);
      fetchData();
    } catch (error) {
      alert("Có lỗi xảy ra");
    } finally {
      setIsProcessing(false);
    }
  };

  const getVietQRUrl = (payment: PaymentRow) => {
    if (!payment.withdrawal_info) return "";
    const bankId = payment.withdrawal_info.bankName;
    const accountNo = payment.withdrawal_info.accountNo;
    const accountName = payment.withdrawal_info.accountName;
    const amount = payment.amount;
    const addInfo = `RUT TIEN ${payment.user?.username || "USER"}`;
    const template = "compact2";
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(
      addInfo
    )}&accountName=${encodeURIComponent(accountName)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quản lý Thanh toán</CardTitle>
        <CardDescription>Duyệt lệnh nạp/rút tiền.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" onValueChange={setCurrentTab} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="pending" className="text-yellow-600">
              Chờ xử lý
            </TabsTrigger>
            <TabsTrigger value="succeeded" className="text-green-600">
              Thành công
            </TabsTrigger>
            <TabsTrigger value="failed" className="text-red-600">
              Thất bại
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((pay) => {
                const isNegative = isNegativeTransaction(pay.payment_for_type);
                const typeInfo = getTypeInfo(pay.payment_for_type);
                const TypeIcon = typeInfo.icon;

                return (
                  <TableRow key={pay.id}>
                    <TableCell>
                      <div className="font-medium">{pay.user?.username}</div>
                      <div className="text-xs text-muted-foreground">
                        {pay.user?.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="capitalize flex w-fit gap-1"
                      >
                        <TypeIcon className={`h-3 w-3 ${typeInfo.color}`} />
                        {/* Hiển thị tên loại đẹp hơn */}
                        {pay.payment_for_type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`font-mono font-bold ${
                        isNegative ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {isNegative ? "-" : "+"}
                      {formatCurrency(pay.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          pay.status === "succeeded"
                            ? "default"
                            : pay.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {pay.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {pay.status === "pending" &&
                        (pay.payment_for_type === "withdrawal" ||
                          pay.payment_for_type === "deposit") && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedPayment(pay)}
                          >
                            <Eye className="h-4 w-4 mr-2" /> Duyệt
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* DIALOG XỬ LÝ (Giữ nguyên logic) */}
        <Dialog
          open={!!selectedPayment}
          onOpenChange={(open) => !open && setSelectedPayment(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedPayment?.payment_for_type === "deposit"
                  ? "Duyệt Nạp Tiền"
                  : "Duyệt Rút Tiền"}
              </DialogTitle>
              <DialogDescription>
                {selectedPayment?.payment_for_type === "deposit"
                  ? 'Kiểm tra tài khoản ngân hàng của bạn. Nếu đã nhận được tiền, hãy bấm "Đã nhận tiền".'
                  : "Quét mã bên dưới để chuyển khoản cho User."}
              </DialogDescription>
            </DialogHeader>

            {/* === CASE 1: RÚT TIỀN (HIỆN QR ĐỂ ADMIN CHUYỂN ĐI) === */}
            {selectedPayment?.payment_for_type === "withdrawal" &&
              (selectedPayment?.withdrawal_info ? (
                <div className="space-y-4">
                  <div className="flex justify-center bg-white p-4 rounded-lg border shadow-sm">
                    <div className="relative w-[250px] aspect-square">
                      <Image
                        src={getVietQRUrl(selectedPayment)}
                        alt="VietQR User"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg border space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ngân hàng:</span>{" "}
                      <span className="font-semibold">
                        {selectedPayment.withdrawal_info.bankName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số TK:</span>{" "}
                      <span className="font-mono font-bold">
                        {selectedPayment.withdrawal_info.accountNo}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chủ TK:</span>{" "}
                      <span className="font-semibold text-blue-600">
                        {selectedPayment.withdrawal_info.accountName}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Số tiền:</span>{" "}
                      <span className="font-bold text-red-600">
                        {formatCurrency(selectedPayment.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-red-500">Thiếu thông tin ngân hàng user!</p>
              ))}

            {/* === CASE 2: NẠP TIỀN (CHỈ HIỆN THÔNG TIN ĐỂ CHECK) === */}
            {selectedPayment?.payment_for_type === "deposit" && (
              <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center space-y-4">
                <p className="text-green-800 font-medium">
                  Yêu cầu nạp vào ví:
                </p>
                <p className="text-4xl font-bold text-green-700">
                  {formatCurrency(selectedPayment.amount)}
                </p>
                <div className="text-sm text-muted-foreground">
                  User: <strong>{selectedPayment.user?.username}</strong> (
                  {selectedPayment.user?.email})
                </div>
                <p className="text-xs text-gray-500 bg-white p-2 rounded">
                  Hãy mở App ngân hàng của bạn và kiểm tra xem có khoản tiền này
                  (với nội dung tương ứng) không.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleUpdateStatus("failed")}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />{" "}
                {selectedPayment?.payment_for_type === "deposit"
                  ? "Chưa nhận được"
                  : "Từ chối"}
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleUpdateStatus("succeeded")}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {selectedPayment?.payment_for_type === "deposit"
                  ? "Đã nhận tiền (Cộng ví)"
                  : "Đã chuyển khoản"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
