// src/components/BuyProductDialog.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Truck, ShoppingCart } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface BuyProductDialogProps {
  product: {
    id: string;
    name: string;
    price: number;
    status: string;
  };
}

export function BuyProductDialog({ product }: BuyProductDialogProps) {
  const { user } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod"); // Default COD

  const handleBuy = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          paymentMethod: paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra.");
      }

      // Thành công -> Chuyển hướng hoặc báo thành công
      alert("Đặt hàng thành công! Vui lòng kiểm tra trạng thái đơn hàng.");
      setIsOpen(false);
      router.refresh(); // Refresh để cập nhật trạng thái sản phẩm trên UI
      // router.push(`/orders/${data.transactionId}`); // (Sau này sẽ làm trang chi tiết đơn hàng)
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Nếu sản phẩm không bán được thì disable nút
  const isAvailable = product.status === "available";

  if (!isAvailable) {
    return (
      <Button disabled variant="secondary" className="w-full md:w-auto">
        Đã bán / Đang giao dịch
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full md:w-auto font-bold text-lg">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Mua ngay
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Xác nhận mua hàng</DialogTitle>
          <DialogDescription>
            Bạn đang đặt mua sản phẩm: <strong>{product.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <h4 className="mb-3 text-sm font-medium">
            Chọn phương thức thanh toán:
          </h4>
          <RadioGroup
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            className="gap-4"
          >
            {/* Option 1: COD */}
            <div className="flex items-center space-x-3 space-y-0 border p-3 rounded-md cursor-pointer hover:bg-accent">
              <RadioGroupItem value="cod" id="cod" />
              <Label
                htmlFor="cod"
                className="flex items-center cursor-pointer flex-1"
              >
                <Truck className="mr-2 h-4 w-4 text-green-600" />
                <div className="flex flex-col">
                  <span>Thanh toán khi nhận hàng (COD)</span>
                  <span className="text-xs text-muted-foreground">
                    Trả tiền mặt cho shipper
                  </span>
                </div>
              </Label>
            </div>

            {/* Option 2: QR */}
            <div className="flex items-center space-x-3 space-y-0 border p-3 rounded-md cursor-pointer hover:bg-accent">
              <RadioGroupItem value="banking_qr" id="qr" />
              <Label
                htmlFor="qr"
                className="flex items-center cursor-pointer flex-1"
              >
                <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
                <div className="flex flex-col">
                  <span>Chuyển khoản ngân hàng (QR)</span>
                  <span className="text-xs text-muted-foreground">
                    Quét mã VietQR/VNPay
                  </span>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Hiển thị thông tin QR nếu chọn Banking (Placeholder) */}
          {paymentMethod === "banking_qr" && (
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-md border border-blue-100">
              ℹ️ Sau khi bấm "Xác nhận", bạn sẽ nhận được mã QR để chuyển khoản.
              Vui lòng chuyển khoản trong vòng 15 phút.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button onClick={handleBuy} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận mua
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
