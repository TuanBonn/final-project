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
import { Input } from "@/components/ui/input";
import { Loader2, CreditCard, Truck, ShoppingCart } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface BuyProductDialogProps {
  product: {
    id: string;
    name: string;
    price: number;
    status: string;
    quantity: number; // Nhận thêm prop quantity
  };
}

export function BuyProductDialog({ product }: BuyProductDialogProps) {
  const { user } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [buyQuantity, setBuyQuantity] = useState(1); // State số lượng mua

  const handleBuy = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (buyQuantity < 1 || buyQuantity > product.quantity) {
      alert(`Vui lòng nhập số lượng hợp lệ (1 - ${product.quantity})`);
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
          quantity: buyQuantity, // Gửi số lượng mua
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra.");
      }

      alert("Đặt hàng thành công! Vui lòng kiểm tra trạng thái đơn hàng.");
      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isAvailable = product.status === "available" && product.quantity > 0;

  if (!isAvailable) {
    return (
      <Button disabled variant="secondary" className="w-full md:w-auto">
        Hết hàng / Ngừng bán
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
            Sản phẩm: <strong>{product.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Chọn số lượng */}
          <div className="flex items-center justify-between border p-3 rounded-md bg-muted/20">
            <Label>Số lượng mua (Kho còn {product.quantity}):</Label>
            <Input
              type="number"
              min="1"
              max={product.quantity}
              value={buyQuantity}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) setBuyQuantity(val);
              }}
              className="w-24 text-center font-bold"
            />
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Phương thức thanh toán:</h4>
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="gap-3"
            >
              <div className="flex items-center space-x-3 border p-3 rounded-md cursor-pointer hover:bg-accent">
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

              <div className="flex items-center space-x-3 border p-3 rounded-md cursor-pointer hover:bg-accent">
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

            {paymentMethod === "banking_qr" && (
              <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-md border border-blue-100">
                ℹ️ Sau khi bấm "Xác nhận", bạn sẽ nhận được mã QR. Vui lòng
                chuyển khoản trong 15 phút.
              </div>
            )}
          </div>
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
