// src/app/cart/page.tsx
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
import { Separator } from "@/components/ui/separator";
// === IMPORT THÊM CÁC COMPONENT UI ===
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
// ====================================
import {
  Trash2,
  ArrowRight,
  Loader2,
  Plus,
  Minus,
  MapPin,
  AlertTriangle,
  Edit,
  Truck, // Icon COD
  Wallet, // Icon Ví
  CreditCard, // Icon QR (nếu cần sau này)
} from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const { user } = useUser();
  const router = useRouter();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  // === STATE PHƯƠNG THỨC THANH TOÁN ===
  const [paymentMethod, setPaymentMethod] = useState("cod");
  // ====================================

  // Tổng tiền
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Thông tin User
  const hasShippingInfo =
    user?.shipping_info?.address && user?.shipping_info?.phone;
  const userBalance = Number(user?.balance || 0);
  const isBalanceEnough = userBalance >= totalAmount;

  const handleCheckout = async () => {
    if (!user) {
      router.push("/login?redirect=/cart");
      return;
    }

    // 1. Validate Địa chỉ
    if (!hasShippingInfo) {
      alert("Vui lòng cập nhật địa chỉ giao hàng trước khi thanh toán.");
      router.push("/profile");
      return;
    }

    // 2. Validate Số dư (Nếu chọn Ví)
    if (paymentMethod === "wallet" && !isBalanceEnough) {
      alert("Số dư ví không đủ để thanh toán đơn hàng này. Vui lòng nạp thêm.");
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
            paymentMethod: paymentMethod, // <-- Gửi phương thức đã chọn
            quantity: item.quantity,
          }),
        })
      );

      const responses = await Promise.all(promises);

      // Kiểm tra lỗi từ API
      let hasError = false;
      for (const res of responses) {
        if (!res.ok) {
          hasError = true;
          const data = await res.json();
          console.error("Lỗi đơn hàng:", data.error);
        }
      }

      if (hasError) {
        alert(
          "Một số sản phẩm không thể đặt hàng (có thể do hết hàng hoặc lỗi hệ thống). Vui lòng kiểm tra lại giỏ hàng."
        );
      } else {
        alert(
          `Đặt hàng thành công! Phương thức: ${
            paymentMethod === "wallet" ? "Ví điện tử" : "COD"
          }`
        );
        clearCart();
        router.push("/orders");
      }
    } catch (error: any) {
      alert(error.message || "Có lỗi khi thanh toán.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto py-20 text-center px-4">
        <div className="max-w-md mx-auto bg-muted/20 rounded-xl p-8 border border-dashed">
          <h1 className="text-2xl font-bold mb-2">Giỏ hàng trống trơn</h1>
          <p className="text-muted-foreground mb-6">
            Bạn chưa thêm sản phẩm nào. Hãy dạo một vòng chợ nhé!
          </p>
          <Button asChild size="lg">
            <Link href="/">Đi mua sắm ngay</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl px-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        Giỏ hàng của bạn
        <span className="text-lg font-normal text-muted-foreground">
          ({items.length} sản phẩm)
        </span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* === CỘT TRÁI: DANH SÁCH SẢN PHẨM === */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4 hover:shadow-md transition-shadow"
            >
              {/* Ảnh SP */}
              <div className="relative w-24 h-24 flex-shrink-0 bg-muted rounded-md overflow-hidden border">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
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
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-semibold truncate text-lg">
                  <Link
                    href={`/products/${item.id}`}
                    className="hover:underline"
                  >
                    {item.name}
                  </Link>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Shop:{" "}
                  <span className="font-medium text-foreground">
                    {item.sellerName}
                  </span>
                </p>
                <p className="text-base font-bold text-primary">
                  {formatCurrency(item.price)}
                </p>
              </div>

              {/* Bộ chỉnh số lượng & Xóa */}
              <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-3 bg-muted/30 p-1 rounded-md border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium text-sm">
                    {item.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= (item.maxQuantity ?? 99)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Xóa
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* === CỘT PHẢI: THANH TOÁN === */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-2 shadow-sm">
            <CardHeader className="bg-muted/20 pb-4">
              <CardTitle>Thông tin thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Tổng tiền */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính:</span>
                  <span className="font-medium">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-xl font-bold pt-2">
                  <span>Tổng cộng:</span>
                  <span className="text-orange-600">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Thông tin giao hàng */}
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-blue-800">
                    <MapPin className="h-4 w-4" /> Giao tới
                  </h4>
                  <Link
                    href="/profile"
                    className="text-xs text-blue-600 hover:underline flex items-center"
                  >
                    <Edit className="h-3 w-3 mr-1" /> Thay đổi
                  </Link>
                </div>

                {hasShippingInfo ? (
                  <div className="text-sm text-slate-700 space-y-1">
                    <p className="font-medium">
                      {user.shipping_info.fullName} | {user.shipping_info.phone}
                    </p>
                    <p className="text-muted-foreground line-clamp-2">
                      {user.shipping_info.address}, {user.shipping_info.city}
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-red-600 flex items-start gap-2 bg-red-50 p-2 rounded border border-red-100">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Chưa có địa chỉ!</p>
                      <Link href="/profile" className="underline text-xs">
                        Cập nhật ngay để mua hàng
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* === CHỌN PHƯƠNG THỨC THANH TOÁN (MỚI) === */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">
                  Phương thức thanh toán
                </h4>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="gap-3"
                >
                  {/* Option 1: COD */}
                  <div className="flex items-center space-x-3 border p-3 rounded-md cursor-pointer hover:bg-accent bg-card">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label
                      htmlFor="cod"
                      className="flex items-center cursor-pointer flex-1"
                    >
                      <Truck className="mr-3 h-5 w-5 text-green-600" />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          Thanh toán khi nhận hàng
                        </span>
                        <span className="text-xs text-muted-foreground">
                          COD (Cash on Delivery)
                        </span>
                      </div>
                    </Label>
                  </div>

                  {/* Option 2: Wallet */}
                  <div
                    className={`flex items-center space-x-3 border p-3 rounded-md cursor-pointer bg-card ${
                      isBalanceEnough
                        ? "hover:bg-accent"
                        : "opacity-70 bg-gray-50"
                    }`}
                  >
                    <RadioGroupItem
                      value="wallet"
                      id="wallet"
                      disabled={!isBalanceEnough}
                    />
                    <Label
                      htmlFor="wallet"
                      className="flex items-center cursor-pointer flex-1"
                    >
                      <Wallet className="mr-3 h-5 w-5 text-orange-600" />
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">Ví điện tử</span>
                        <span
                          className={`text-xs font-medium ${
                            isBalanceEnough ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          Số dư: {formatCurrency(userBalance)}
                        </span>
                      </div>
                      {!isBalanceEnough && (
                        <span className="text-[10px] text-red-500 font-bold ml-2">
                          Thiếu tiền
                        </span>
                      )}
                    </Label>
                  </div>

                  {/* Option 3: QR (Optional) */}
                  {/* <div className="flex items-center space-x-3 border p-3 rounded-md cursor-pointer hover:bg-accent bg-card">
                      <RadioGroupItem value="banking_qr" id="qr" />
                      <Label htmlFor="qr" className="flex items-center cursor-pointer flex-1">
                        <CreditCard className="mr-3 h-5 w-5 text-blue-600" />
                        <div className="flex flex-col">
                           <span className="font-medium">Chuyển khoản QR</span>
                           <span className="text-xs text-muted-foreground">VietQR / Banking</span>
                        </div>
                      </Label>
                    </div> */}
                </RadioGroup>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 bg-muted/20 pt-6">
              <Button
                className="w-full py-6 text-lg font-bold shadow-md bg-orange-600 hover:bg-orange-700 transition-all"
                onClick={handleCheckout}
                disabled={
                  isCheckingOut ||
                  !hasShippingInfo ||
                  (paymentMethod === "wallet" && !isBalanceEnough)
                }
              >
                {isCheckingOut ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <ArrowRight className="mr-2 h-5 w-5" />
                )}
                {paymentMethod === "wallet"
                  ? "Thanh toán ngay"
                  : "Đặt Hàng (COD)"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Nhấn đặt hàng đồng nghĩa với việc bạn đồng ý với điều khoản của
                sàn.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
