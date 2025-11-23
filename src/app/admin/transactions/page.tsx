// src/app/admin/transactions/page.tsx
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
import { TransactionActions } from "@/components/admin/TransactionActions";
// Import Enum từ Prisma
import { TransactionStatus, PaymentMethod } from "@prisma/client";

// Kiểu dữ liệu hiển thị (đã được Prisma generate)
interface TransactionRow {
  id: string;
  status: TransactionStatus;
  payment_method: PaymentMethod;
  amount: number; // API trả về number
  platform_commission: number;
  created_at: string;
  product: { name: string } | null;
  buyer: { username: string | null } | null;
  seller: { username: string | null } | null;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentTab !== "all") params.append("status", currentTab);

      const res = await fetch(`/api/admin/transactions?${params.toString()}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
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
        <CardTitle>Quản lý Giao dịch</CardTitle>
        <CardDescription>Danh sách đơn hàng và trạng thái.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" onValueChange={setCurrentTab} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="buyer_paid">Đã thanh toán</TabsTrigger>
            <TabsTrigger value="disputed" className="text-red-500">
              Khiếu nại
            </TabsTrigger>
            <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
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
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Người mua / Bán</TableHead>
                <TableHead>Thanh toán</TableHead>
                <TableHead>Giá trị</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">
                    {tx.product?.name || "---"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>B: {tx.buyer?.username}</div>
                    <div className="text-muted-foreground">
                      S: {tx.seller?.username}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {tx.payment_method.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(tx.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tx.status === "completed" ? "default" : "secondary"
                      }
                    >
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <TransactionActions
                      transaction={tx}
                      onActionSuccess={fetchData}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Chưa có giao dịch nào.
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
