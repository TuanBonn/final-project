// // src/app/orders/page.tsx
// "use client";

// import { useEffect, useState, useCallback } from "react";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import {
//   Loader2,
//   Package,
//   Truck,
//   CheckCircle,
//   XCircle,
//   AlertTriangle,
// } from "lucide-react";
// import Image from "next/image";
// // Import từ Prisma
// import { TransactionStatus, PaymentMethod } from "@prisma/client";
// // Import Review Dialog mới
// import { ReviewDialog } from "@/components/ReviewDialog";

// interface Order {
//   id: string;
//   status: TransactionStatus;
//   amount: number;
//   payment_method: PaymentMethod;
//   created_at: string;
//   product: { name: string; image_urls: string[] | null } | null;
//   seller: { username: string; full_name: string } | null;
//   buyer: { username: string; full_name: string } | null;
//   // Mảng reviews để check xem đã đánh giá chưa (thường chỉ có 0 hoặc 1 phần tử)
//   reviews: { id: string }[];
// }

// const formatCurrency = (amount: number) =>
//   new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
//     amount
//   );

// export default function OrdersPage() {
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [type, setType] = useState<"buy" | "sell">("buy");
//   const [processingId, setProcessingId] = useState<string | null>(null);

//   // Hàm fetch danh sách đơn hàng
//   const fetchOrders = useCallback(async () => {
//     setLoading(true);
//     try {
//       const res = await fetch(`/api/orders?type=${type}`);
//       const data = await res.json();
//       setOrders(data.orders || []);
//     } catch (error) {
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   }, [type]);

//   useEffect(() => {
//     fetchOrders();
//   }, [fetchOrders]);

//   // Hàm xử lý hành động (Hủy, Gửi, Nhận, Khiếu nại)
//   const handleAction = async (orderId: string, action: string) => {
//     if (!confirm("Bạn có chắc chắn muốn thực hiện hành động này?")) return;
//     setProcessingId(orderId);
//     try {
//       const res = await fetch(`/api/orders/${orderId}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ action }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error);

//       alert(data.message);
//       fetchOrders(); // Refresh lại danh sách
//     } catch (error: any) {
//       alert(error.message);
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   // Helper hiển thị nút bấm tùy theo trạng thái & vai trò
//   const renderActions = (order: Order) => {
//     const isBuyer = type === "buy";
//     const isReviewed = order.reviews && order.reviews.length > 0;

//     // 1. Đã hủy
//     if (order.status === "cancelled") {
//       return (
//         <Badge variant="outline" className="bg-muted text-muted-foreground">
//           Đã hủy
//         </Badge>
//       );
//     }

//     // 2. Đã hoàn thành (Hiển thị nút Đánh giá cho Buyer)
//     if (order.status === "completed") {
//       if (isBuyer) {
//         if (isReviewed) {
//           return (
//             <span className="text-sm text-green-600 font-medium flex items-center gap-1">
//               <CheckCircle className="h-3 w-3" /> Đã đánh giá
//             </span>
//           );
//         }
//         return (
//           <ReviewDialog
//             transactionId={order.id}
//             productName={order.product?.name || "Sản phẩm"}
//             onSuccess={fetchOrders}
//           />
//         );
//       }
//       return (
//         <Badge
//           variant="outline"
//           className="border-green-600 text-green-600 bg-green-50"
//         >
//           Giao dịch thành công
//         </Badge>
//       );
//     }

//     // 3. Đang tranh chấp
//     if (order.status === "disputed") {
//       return <Badge variant="destructive">Đang khiếu nại</Badge>;
//     }

//     // 4. Các trạng thái đang xử lý
//     if (isBuyer) {
//       // --- Người mua ---
//       if (order.status === "initiated") {
//         return (
//           <Button
//             size="sm"
//             variant="destructive"
//             onClick={() => handleAction(order.id, "cancel")}
//             disabled={!!processingId}
//           >
//             <XCircle className="mr-2 h-4 w-4" /> Hủy đơn
//           </Button>
//         );
//       }
//       if (order.status === "seller_shipped") {
//         return (
//           <div className="flex gap-2">
//             <Button
//               size="sm"
//               className="bg-green-600 hover:bg-green-700"
//               onClick={() => handleAction(order.id, "confirm")}
//               disabled={!!processingId}
//             >
//               <CheckCircle className="mr-2 h-4 w-4" /> Đã nhận hàng
//             </Button>
//             <Button
//               size="sm"
//               variant="outline"
//               className="text-red-600 border-red-200 hover:bg-red-50"
//               onClick={() => handleAction(order.id, "dispute")}
//               disabled={!!processingId}
//             >
//               <AlertTriangle className="mr-2 h-4 w-4" /> Khiếu nại
//             </Button>
//           </div>
//         );
//       }
//       if (order.status === "buyer_paid") {
//         return (
//           <span className="text-sm text-muted-foreground">
//             Chờ shop gửi hàng...
//           </span>
//         );
//       }
//     } else {
//       // --- Người bán ---
//       if (order.status === "initiated" || order.status === "buyer_paid") {
//         return (
//           <Button
//             size="sm"
//             onClick={() => handleAction(order.id, "ship")}
//             disabled={!!processingId}
//           >
//             <Truck className="mr-2 h-4 w-4" /> Xác nhận gửi hàng
//           </Button>
//         );
//       }
//       if (order.status === "seller_shipped") {
//         return (
//           <span className="text-sm text-muted-foreground">
//             Đang giao hàng...
//           </span>
//         );
//       }
//     }

//     return <span className="text-sm text-muted-foreground">Đang xử lý...</span>;
//   };

//   return (
//     <div className="container mx-auto py-8 max-w-4xl px-4">
//       <Card>
//         <CardHeader>
//           <CardTitle>Quản lý Đơn hàng</CardTitle>
//           <CardDescription>
//             Theo dõi các đơn mua và đơn bán của bạn.
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <Tabs
//             defaultValue="buy"
//             onValueChange={(val) => setType(val as "buy" | "sell")}
//             className="mb-6"
//           >
//             <TabsList className="grid w-full grid-cols-2">
//               <TabsTrigger value="buy">Đơn Mua (Tôi là người mua)</TabsTrigger>
//               <TabsTrigger value="sell">Đơn Bán (Tôi là người bán)</TabsTrigger>
//             </TabsList>
//           </Tabs>

//           {loading ? (
//             <div className="flex justify-center py-10">
//               <Loader2 className="animate-spin" />
//             </div>
//           ) : orders.length === 0 ? (
//             <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
//               Chưa có đơn hàng nào.
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {orders.map((order) => (
//                 <div
//                   key={order.id}
//                   className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg hover:bg-accent/10 transition-colors bg-card"
//                 >
//                   {/* Ảnh SP */}
//                   <div className="relative w-20 h-20 flex-shrink-0 bg-muted rounded-md overflow-hidden border">
//                     {order.product?.image_urls?.[0] ? (
//                       <Image
//                         src={order.product.image_urls[0]}
//                         alt="Product"
//                         fill
//                         className="object-cover"
//                       />
//                     ) : (
//                       <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
//                         No Img
//                       </div>
//                     )}
//                   </div>

//                   {/* Thông tin */}
//                   <div className="flex-1 space-y-1">
//                     <h3 className="font-semibold text-lg line-clamp-1">
//                       {order.product?.name || "Sản phẩm ẩn"}
//                     </h3>
//                     <p className="text-sm text-muted-foreground">
//                       {type === "buy"
//                         ? `Shop: ${order.seller?.username}`
//                         : `Khách: ${order.buyer?.username}`}
//                     </p>
//                     <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
//                       <span>
//                         {new Date(order.created_at).toLocaleDateString("vi-VN")}
//                       </span>
//                       <span>•</span>
//                       <span className="uppercase font-medium">
//                         {order.payment_method}
//                       </span>
//                     </div>
//                   </div>

//                   {/* Giá & Trạng thái */}
//                   <div className="flex flex-col items-end justify-between gap-2 min-w-[140px]">
//                     <div className="text-right">
//                       <p className="font-bold text-lg text-primary">
//                         {formatCurrency(order.amount)}
//                       </p>
//                       <div className="flex justify-end mt-1">
//                         {/* Badge trạng thái nhỏ nếu cần */}
//                       </div>
//                     </div>

//                     {/* Nút hành động */}
//                     <div className="flex items-center gap-2 justify-end">
//                       {renderActions(order)}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

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
// Import từ Prisma
import { TransactionStatus, PaymentMethod } from "@prisma/client";
// Import Review Dialog mới
import { ReviewDialog } from "@/components/ReviewDialog";

interface Order {
  id: string;
  status: TransactionStatus;
  amount: number;
  payment_method: PaymentMethod;
  created_at: string;
  product: { name: string; image_urls: string[] | null } | null;
  seller: { username: string; full_name: string } | null;
  buyer: { username: string; full_name: string } | null;
  // Mảng reviews để check xem đã đánh giá chưa (thường chỉ có 0 hoặc 1 phần tử)
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

  // Hàm fetch danh sách đơn hàng
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

  // Hàm xử lý hành động (Hủy, Gửi, Nhận, Khiếu nại)
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
      fetchOrders(); // Refresh lại danh sách
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Helper hiển thị nút bấm tùy theo trạng thái & vai trò
  const renderActions = (order: Order) => {
    const isBuyer = type === "buy";
    const isReviewed = order.reviews && order.reviews.length > 0;

    // 1. Đã hủy
    if (order.status === "cancelled") {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          Đã hủy
        </Badge>
      );
    }

    // 2. Đã hoàn thành (Hiển thị nút Đánh giá cho Buyer)
    if (order.status === "completed") {
      if (isBuyer) {
        if (isReviewed) {
          return (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Đã đánh giá
            </span>
          );
        }
        return (
          <ReviewDialog
            transactionId={order.id}
            productName={order.product?.name || "Sản phẩm"}
            onSuccess={fetchOrders}
          />
        );
      }
      return (
        <Badge
          variant="outline"
          className="border-green-600 text-green-600 bg-green-50"
        >
          Giao dịch thành công
        </Badge>
      );
    }

    // 3. Đang tranh chấp
    if (order.status === "disputed") {
      return <Badge variant="destructive">Đang khiếu nại</Badge>;
    }

    // 4. Các trạng thái đang xử lý
    if (isBuyer) {
      // --- Người mua ---
      // Cho phép hủy nếu là initiated (COD) HOẶC buyer_paid (Ví/QR)
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
    } else {
      // --- Người bán ---
      if (order.status === "initiated" || order.status === "buyer_paid") {
        return (
          <div className="flex flex-col items-end gap-1">
            {order.status === "buyer_paid" && (
              <span className="text-[10px] text-green-600 font-medium">
                Khách đã thanh toán
              </span>
            )}
            <Button
              size="sm"
              onClick={() => handleAction(order.id, "ship")}
              disabled={!!processingId}
            >
              <Truck className="mr-2 h-4 w-4" /> Xác nhận gửi hàng
            </Button>
          </div>
        );
      }
      if (order.status === "seller_shipped") {
        return (
          <span className="text-sm text-muted-foreground">
            Đang giao hàng...
          </span>
        );
      }
    }

    return <span className="text-sm text-muted-foreground">Đang xử lý...</span>;
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
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
            <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              Chưa có đơn hàng nào.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg hover:bg-accent/10 transition-colors bg-card"
                >
                  {/* Ảnh SP */}
                  <div className="relative w-20 h-20 flex-shrink-0 bg-muted rounded-md overflow-hidden border">
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

                  {/* Thông tin */}
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-lg line-clamp-1">
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
                      <span className="uppercase font-medium">
                        {order.payment_method}
                      </span>
                    </div>
                  </div>

                  {/* Giá & Trạng thái */}
                  <div className="flex flex-col items-end justify-between gap-2 min-w-[140px]">
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">
                        {formatCurrency(order.amount)}
                      </p>
                      <div className="flex justify-end mt-1">
                        {/* Badge trạng thái nhỏ nếu cần */}
                      </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center gap-2 justify-end">
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
