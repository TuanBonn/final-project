"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2, ArrowRight, Loader2, Plus, Minus } from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const { user } = useUser();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Tổng tiền = Tổng (giá * số lượng từng món)
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (!user) {
      router.push("/login?redirect=/cart");
      return;
    }

    if (items.length === 0) return;

    setIsCheckingOut(true);
    try {
      // Tạo các đơn hàng song song
      const promises = items.map((item) =>
        fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.id,
            paymentMethod: "cod", // Mặc định COD
            quantity: item.quantity, // Gửi số lượng
          }),
        })
      );

      const responses = await Promise.all(promises);

      // Kiểm tra lỗi
      const failed = responses.some((res) => !res.ok);
      if (failed)
        throw new Error("Một số đơn hàng bị lỗi (có thể do hết hàng).");

      alert("Đặt hàng thành công tất cả sản phẩm! (Thanh toán COD)");
      clearCart();
      router.push("/orders");
    } catch (error: any) {
      alert(error.message || "Có lỗi khi thanh toán.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Giỏ hàng trống trơn</h1>
        <p className="text-muted-foreground mb-8">
          Bạn chưa thêm sản phẩm nào.
        </p>
        <Button asChild>
          <Link href="/">Đi mua sắm ngay</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <h1 className="text-3xl font-bold mb-6">Giỏ hàng của bạn</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Danh sách sản phẩm */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4"
            >
              <div className="relative w-20 h-20 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs">
                    No Image
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-semibold truncate">
                  <Link href={`/products/${item.id}`}>{item.name}</Link>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Shop: {item.sellerName}
                </p>
                <p className="text-sm font-bold text-primary">
                  {formatCurrency(item.price)}
                </p>
              </div>

              {/* Bộ chỉnh số lượng */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="w-8 text-center font-medium text-sm">
                  {item.quantity}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  disabled={item.quantity >= item.maxQuantity}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </Card>
          ))}
        </div>

        {/* Tổng tiền & Thanh toán */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Tổng cộng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Số lượng sản phẩm:
                </span>
                <span className="font-medium">
                  {items.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-4">
                <span>Thành tiền:</span>
                <span className="text-orange-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full size-lg text-lg"
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <ArrowRight className="mr-2 h-5 w-5" />
                )}
                Thanh toán (COD)
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
