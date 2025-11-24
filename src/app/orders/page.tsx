// src/app/orders/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import { TransactionStatus, PaymentMethod } from "@prisma/client";

interface Order {
  id: string;
  status: TransactionStatus;
  amount: number;
  payment_method: PaymentMethod;
  created_at: string;
  product: { name: string; image_urls: string[] | null } | null;
  seller: { username: string; full_name: string } | null;
  buyer: { username: string; full_name: string } | null;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?type=${type}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Hàm xử lý hành động
  const handleAction = async (orderId: string, action: string) => {
    if (!confirm("Bạn có chắc chắn muốn thực hiện hành động này?")) return;
    setProcessingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      fetchOrders();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Helper hiển thị nút bấm tùy theo trạng thái
  const renderActions = (order: Order) => {
    const isBuyer = type === "buy";

    if (order.status === "completed" || order.status === "cancelled")
      return null;

    if (isBuyer) {
      // Người mua
      if (order.status === "initiated") {
        return (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleAction(order.id, "cancel")}
            disabled={!!processingId}
          >
            <XCircle className="mr-2 h-4 w-4" /> Hủy đơn
          </Button>
        );
      }
      if (order.status === "seller_shipped") {
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleAction(order.id, "confirm")}
              disabled={!!processingId}
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Đã nhận được hàng
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => handleAction(order.id, "dispute")}
              disabled={!!processingId}
            >
              <AlertTriangle className="mr-2 h-4 w-4" /> Khiếu nại
            </Button>
          </div>
        );
      }
    } else {
      // Người bán
      if (order.status === "initiated" || order.status === "buyer_paid") {
        return (
          <Button
            size="sm"
            onClick={() => handleAction(order.id, "ship")}
            disabled={!!processingId}
          >
            <Truck className="mr-2 h-4 w-4" /> Xác nhận gửi hàng
          </Button>
        );
      }
    }
    return (
      <span className="text-sm text-muted-foreground">Chờ đối phương...</span>
    );
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Quản lý Đơn hàng</CardTitle>
          <CardDescription>
            Theo dõi các đơn mua và đơn bán của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="buy"
            onValueChange={(val) => setType(val as "buy" | "sell")}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy">Đơn Mua (Tôi là người mua)</TabsTrigger>
              <TabsTrigger value="sell">Đơn Bán (Tôi là người bán)</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Chưa có đơn hàng nào.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg hover:bg-accent/10 transition-colors"
                >
                  {/* Ảnh SP */}
                  <div className="relative w-20 h-20 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                    {order.product?.image_urls?.[0] && (
                      <Image
                        src={order.product.image_urls[0]}
                        alt="Product"
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>

                  {/* Thông tin */}
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-lg">
                      {order.product?.name || "Sản phẩm ẩn"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {type === "buy"
                        ? `Shop: ${order.seller?.username}`
                        : `Khách: ${order.buyer?.username}`}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>
                        {new Date(order.created_at).toLocaleDateString("vi-VN")}
                      </span>
                      <span>•</span>
                      <span className="uppercase">{order.payment_method}</span>
                    </div>
                  </div>

                  {/* Giá & Trạng thái */}
                  <div className="flex flex-col items-end justify-between gap-2">
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {formatCurrency(order.amount)}
                      </p>
                      <Badge
                        variant={
                          order.status === "completed" ? "default" : "outline"
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center gap-2">
                      {renderActions(order)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
