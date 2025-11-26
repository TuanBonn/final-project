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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Search } from "lucide-react";
import { TransactionActions } from "@/components/admin/TransactionActions";
import { TransactionStatus, PaymentMethod } from "@prisma/client";
import { OrderDetailsDialog } from "@/components/OrderDetailsDialog";
import { Pagination } from "@/components/Pagination";

interface TransactionRow {
  id: string;
  status: TransactionStatus;
  payment_method: PaymentMethod;
  amount: number;
  platform_commission: number;
  created_at: string;
  quantity: number;
  shipping_address: any;
  product: { name: string; image_urls: string[] | null } | null;
  buyer: { username: string | null; full_name: string | null } | null;
  seller: { username: string | null; full_name: string | null } | null;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search: search,
      });

      if (currentTab !== "all") params.append("status", currentTab);

      const res = await fetch(`/api/admin/transactions?${params.toString()}`);
      const data = await res.json();

      setTransactions(data.transactions || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentTab, page, search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Quản lý Giao dịch</CardTitle>
            <CardDescription>Danh sách đơn hàng và trạng thái.</CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên SP hoặc Mã đơn..." // <-- SỬA DÒNG NÀY
              className="pl-9 w-full bg-background"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="all"
          onValueChange={(val) => {
            setCurrentTab(val);
            setPage(1);
          }}
          className="mb-4"
        >
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
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
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
                      <TableCell>
                        <div
                          className="font-medium max-w-[200px] truncate"
                          title={tx.product?.name}
                        >
                          {tx.product?.name || "---"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          SL: {tx.quantity}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-blue-600 text-xs bg-blue-50 px-1 rounded">
                              B
                            </span>
                            <span className="truncate max-w-[100px]">
                              {tx.buyer?.username}
                            </span>
                            <div className="scale-90 origin-left">
                              <OrderDetailsDialog
                                shippingAddress={tx.shipping_address}
                                buyerName={
                                  tx.buyer?.full_name ||
                                  tx.buyer?.username ||
                                  "Khách"
                                }
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-semibold text-orange-600 text-xs bg-orange-50 px-1 rounded">
                              S
                            </span>
                            <span>{tx.seller?.username}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="uppercase text-[10px]"
                        >
                          {tx.payment_method.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatCurrency(tx.amount)}
                          </span>
                          {tx.platform_commission > 0 && (
                            <span className="text-[10px] text-green-600">
                              Fee: +{formatCurrency(tx.platform_commission)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.status === "completed"
                              ? "default"
                              : tx.status === "cancelled" ||
                                tx.status === "disputed"
                              ? "destructive"
                              : "secondary"
                          }
                          className="capitalize"
                        >
                          {tx.status.replace("_", " ")}
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
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-10 w-10 opacity-20" />
                          <p>Chưa có giao dịch nào.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 border-t pt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                loading={loading}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
