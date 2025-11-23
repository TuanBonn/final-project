// src/app/admin/group-buys/page.tsx
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
import { Loader2, AlertCircle, Users, Clock } from "lucide-react";
import { GroupBuyActions } from "@/components/admin/GroupBuyActions";
import { GroupBuyStatus } from "@prisma/client";

interface GroupBuyRow {
  id: string;
  product_name: string;
  price_per_unit: number;
  target_quantity: number;
  participant_count: number;
  join_deadline: string;
  status: GroupBuyStatus;
  created_at: string;
  host: { username: string | null; email: string } | null;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

const getStatusBadge = (status: GroupBuyStatus) => {
  switch (status) {
    case "open":
      return <Badge className="bg-blue-600">Đang gom</Badge>;
    case "successful":
      return <Badge className="bg-green-600">Thành công</Badge>;
    case "failed":
      return <Badge variant="destructive">Thất bại</Badge>;
    case "completed":
      return <Badge variant="outline">Hoàn tất</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function AdminGroupBuysPage() {
  const [groupBuys, setGroupBuys] = useState<GroupBuyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("all");

  const fetchData = useCallback(async (tab: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== "all") params.append("status", tab);

      const res = await fetch(`/api/admin/group-buys?${params.toString()}`);
      const data = await res.json();
      setGroupBuys(data.groupBuys || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentTab);
  }, [currentTab, fetchData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quản lý Mua chung (Group Buy)</CardTitle>
        <CardDescription>
          Theo dõi các kèo gom hàng của cộng đồng.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" onValueChange={setCurrentTab} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="open">Đang gom (Open)</TabsTrigger>
            <TabsTrigger value="successful" className="text-green-600">
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
                <TableHead>Tên Deal</TableHead>
                <TableHead>Host (Chủ kèo)</TableHead>
                <TableHead>Giá / món</TableHead>
                <TableHead>Tiến độ</TableHead>
                <TableHead>Hạn chót</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupBuys.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Chưa có kèo mua chung nào.
                  </TableCell>
                </TableRow>
              ) : (
                groupBuys.map((gb) => (
                  <TableRow key={gb.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {gb.product_name}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        @{gb.host?.username || "---"}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-blue-600">
                      {formatCurrency(gb.price_per_unit)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="font-bold">
                          {gb.participant_count}
                        </span>{" "}
                        / {gb.target_quantity}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(gb.join_deadline).toLocaleDateString("vi-VN")}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(gb.status)}</TableCell>
                    <TableCell className="text-right">
                      <GroupBuyActions
                        groupBuy={{
                          id: gb.id,
                          status: gb.status,
                          productName: gb.product_name,
                        }}
                        onActionSuccess={() => fetchData(currentTab)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
