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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Package,
} from "lucide-react";
import Image from "next/image";
import { TransactionStatus, PaymentMethod } from "@prisma/client";
import { ReviewDialog } from "@/components/ReviewDialog";
import { OrderDetailsDialog } from "@/components/OrderDetailsDialog";
import { Pagination } from "@/components/Pagination";

interface Order {
  id: string;
  status: TransactionStatus;
  amount: number;
  payment_method: PaymentMethod;
  created_at: string;
  quantity: number;
  shipping_address: any;
  product: { name: string; image_urls: string[] | null } | null;
  seller: { username: string; full_name: string } | null;
  buyer: { username: string; full_name: string } | null;
  reviews: { id: string }[];
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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type,
        page: page.toString(),
        limit: "5",
        search,
      });

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();

      setOrders(data.orders || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [type, page, search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchOrders();
    }, 500);
    return () => clearTimeout(timeout);
  }, [fetchOrders]);

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

  const renderActions = (order: Order) => {
    const isBuyer = type === "buy";

    if (isBuyer) {
      if (order.status === "cancelled") {
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Đã hủy
          </Badge>
        );
      }
      if (order.status === "completed") {
        const isReviewed = order.reviews && order.reviews.length > 0;
        if (isReviewed)
          return (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Đã đánh giá
            </span>
          );
        return (
          <ReviewDialog
            transactionId={order.id}
            productName={order.product?.name || "Sản phẩm"}
            onSuccess={fetchOrders}
          />
        );
      }
      if (order.status === "disputed")
        return <Badge variant="destructive">Đang khiếu nại</Badge>;
      if (order.status === "initiated" || order.status === "buyer_paid") {
        return (
          <div className="flex flex-col items-end gap-1">
            {order.status === "buyer_paid" && (
              <span className="text-[10px] text-green-600 font-medium">
                Đã thanh toán (Hủy sẽ hoàn tiền)
              </span>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleAction(order.id, "cancel")}
              disabled={!!processingId}
            >
              <XCircle className="mr-2 h-4 w-4" /> Hủy đơn
            </Button>
          </div>
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
              <CheckCircle className="mr-2 h-4 w-4" /> Đã nhận hàng
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
      return (
        <span className="text-sm text-muted-foreground">Đang xử lý...</span>
      );
    } else {
      const AddressButton = (
        <OrderDetailsDialog
          shippingAddress={order.shipping_address}
          buyerName={order.buyer?.full_name || order.buyer?.username || "Khách"}
        />
      );
      const ActionWrapper = ({ children }: { children: React.ReactNode }) => (
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          {AddressButton}
          {children}
        </div>
      );

      if (order.status === "cancelled")
        return (
          <ActionWrapper>
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              Đã hủy
            </Badge>
          </ActionWrapper>
        );
      if (order.status === "completed")
        return (
          <ActionWrapper>
            <Badge
              variant="outline"
              className="border-green-600 text-green-600 bg-green-50"
            >
              Giao dịch thành công
            </Badge>
          </ActionWrapper>
        );
      if (order.status === "disputed")
        return (
          <ActionWrapper>
            <Badge variant="destructive">Khách khiếu nại</Badge>
          </ActionWrapper>
        );
      if (order.status === "initiated" || order.status === "buyer_paid") {
        return (
          <ActionWrapper>
            <div className="flex flex-col items-end gap-1">
              {order.status === "buyer_paid" && (
                <span className="text-[10px] text-green-600 font-medium hidden sm:inline-block">
                  Khách đã thanh toán
                </span>
              )}
              <Button
                size="sm"
                onClick={() => handleAction(order.id, "ship")}
                disabled={!!processingId}
              >
                <Truck className="mr-2 h-4 w-4" /> Xác nhận gửi
              </Button>
            </div>
          </ActionWrapper>
        );
      }
      if (order.status === "seller_shipped")
        return (
          <ActionWrapper>
            <Badge variant="secondary" className="text-muted-foreground">
              Đang giao hàng...
            </Badge>
          </ActionWrapper>
        );
      return (
        <ActionWrapper>
          <span className="text-sm text-muted-foreground">Đang xử lý...</span>
        </ActionWrapper>
      );
    }
  };

  // Placeholder text thay đổi theo Tab
  const searchPlaceholder =
    type === "buy" ? "Tìm theo tên người bán..." : "Tìm theo tên người mua...";

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <Card className="border-none shadow-none sm:border sm:shadow-sm bg-transparent sm:bg-card">
        <CardHeader className="px-0 sm:px-6 pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Quản lý Đơn hàng</CardTitle>
              <CardDescription>
                Theo dõi và xử lý đơn hàng của bạn.
              </CardDescription>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
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

        <CardContent className="px-0 sm:px-6">
          <Tabs
            defaultValue="buy"
            onValueChange={(val) => {
              setType(val as "buy" | "sell");
              setPage(1);
              setSearch("");
            }}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="buy" className="text-base">
                Đơn Mua
              </TabsTrigger>
              <TabsTrigger value="sell" className="text-base">
                Đơn Bán
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex justify-center py-20 min-h-[300px] items-center">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed">
              <Package className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground font-medium">
                Không tìm thấy đơn hàng nào.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl hover:bg-accent/5 transition-all bg-card shadow-sm"
                >
                  <div className="flex gap-4 flex-1">
                    <div className="relative w-24 h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden border">
                      {order.product?.image_urls?.[0] ? (
                        <Image
                          src={order.product.image_urls[0]}
                          alt="Product"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                          No Img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5 py-0.5">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-base line-clamp-2 leading-tight">
                          {order.product?.name || "Sản phẩm ẩn"}
                        </h3>
                        <Badge
                          variant="outline"
                          className="shrink-0 h-6 px-2 text-xs font-mono"
                        >
                          x{order.quantity || 1}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {type === "buy"
                          ? `Shop: ${order.seller?.username}`
                          : `Khách: ${order.buyer?.username}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
                        <span className="bg-muted px-2 py-0.5 rounded">
                          {new Date(order.created_at).toLocaleDateString(
                            "vi-VN"
                          )}
                        </span>
                        <span className="uppercase font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                          {order.payment_method.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:min-w-[200px] border-t sm:border-t-0 pt-4 sm:pt-0 mt-2 sm:mt-0 pl-0 sm:pl-4 sm:border-l border-dashed">
                    <div className="text-left sm:text-right">
                      <p className="font-bold text-lg text-primary">
                        {formatCurrency(order.amount)}
                      </p>
                    </div>
                    <div className="flex items-center justify-end w-full">
                      {renderActions(order)}
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  loading={loading}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
