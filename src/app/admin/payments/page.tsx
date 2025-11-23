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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
// Import Enum từ Prisma
import { PaymentStatus, PaymentForType } from "@prisma/client";

// Định nghĩa kiểu dữ liệu hiển thị
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
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

const formatPaymentType = (type: PaymentForType) => {
  switch (type) {
    case "deposit":
      return "Nạp tiền (Vào ví)";
    case "withdrawal":
      return "Rút tiền (Khỏi ví)";
    case "transaction_commission":
      return "Phí hoa hồng";
    case "dealer_subscription":
      return "Phí đăng ký Dealer";
    case "auction_creation_fee":
      return "Phí tạo đấu giá";
    case "auction_bid_fee":
      return "Phí tham gia đấu giá";
    default:
      return type;
  }
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("all");

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lịch sử Thanh toán</CardTitle>
        <CardDescription>Theo dõi dòng tiền (Nạp/Rút/Phí).</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" onValueChange={setCurrentTab} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="succeeded" className="text-green-600">
              Thành công
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-yellow-600">
              Đang xử lý
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
                <TableHead>Người dùng</TableHead>
                <TableHead>Loại giao dịch</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((pay) => (
                <TableRow key={pay.id}>
                  <TableCell>
                    <div className="font-medium">
                      {pay.user?.username || "---"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pay.user?.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatPaymentType(pay.payment_for_type)}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`font-mono font-bold ${
                      pay.payment_for_type === "withdrawal"
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {pay.payment_for_type === "withdrawal" ? "-" : "+"}
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
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {new Date(pay.created_at).toLocaleDateString("vi-VN")}
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Chưa có dữ liệu.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
