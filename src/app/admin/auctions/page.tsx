// src/app/admin/auctions/page.tsx
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
import { Button } from "@/components/ui/button"; // <-- Import Button
import { Loader2, AlertCircle, Gavel, Clock, ShieldAlert } from "lucide-react"; // <-- Import Icon
import { AuctionActions } from "@/components/admin/AuctionActions";
import { AuctionStatus } from "@prisma/client";

interface AuctionRow {
  id: string;
  status: AuctionStatus;
  starting_bid: number;
  start_time: string;
  end_time: string;
  bid_count: number;
  created_at: string;
  product: { name: string } | null;
  seller: { username: string | null } | null;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

export default function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("all");
  const [scanning, setScanning] = useState(false); // State cho nút quét

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentTab !== "all") params.append("status", currentTab);

      const res = await fetch(`/api/admin/auctions?${params.toString()}`);
      const data = await res.json();
      setAuctions(data.auctions || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Hàm xử lý quét đơn quá hạn
  const handleScanOverdue = async () => {
    if (
      !confirm(
        "Hệ thống sẽ quét các đơn kết thúc > 24h chưa thanh toán và trừ điểm uy tín. Tiếp tục?"
      )
    )
      return;

    setScanning(true);
    try {
      const res = await fetch("/api/admin/auctions/check-overdue", {
        method: "POST",
      });
      const data = await res.json();
      alert(data.message || "Đã hoàn tất quét.");
      fetchData(); // Reload lại bảng
    } catch (error) {
      alert("Lỗi khi quét.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Quản lý Đấu giá</CardTitle>
          <CardDescription>
            Theo dõi và kiểm duyệt các phiên đấu giá.
          </CardDescription>
        </div>

        {/* NÚT QUÉT ĐƠN QUÁ HẠN */}
        <Button
          variant="destructive"
          onClick={handleScanOverdue}
          disabled={scanning}
          className="gap-2"
        >
          {scanning ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : (
            <ShieldAlert className="h-4 w-4" />
          )}
          Quét đơn bùng kèo (24h)
        </Button>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="all" onValueChange={setCurrentTab} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="active" className="text-green-600">
              Đang diễn ra
            </TabsTrigger>
            <TabsTrigger value="scheduled">Sắp tới</TabsTrigger>
            <TabsTrigger value="ended">Đã kết thúc</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-red-600">
              Đã hủy
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
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Người bán</TableHead>
                <TableHead>Giá khởi điểm</TableHead>
                <TableHead>Lượt Bid</TableHead>
                <TableHead>Kết thúc lúc</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auctions.map((au) => (
                <TableRow key={au.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {au.product?.name || "---"}
                  </TableCell>
                  <TableCell>@{au.seller?.username}</TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(au.starting_bid)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Gavel className="h-3 w-3" /> {au.bid_count}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(au.end_time).toLocaleString("vi-VN")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={au.status === "active" ? "default" : "outline"}
                    >
                      {au.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AuctionActions auction={au} onActionSuccess={fetchData} />
                  </TableCell>
                </TableRow>
              ))}
              {auctions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Chưa có phiên đấu giá nào.
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
