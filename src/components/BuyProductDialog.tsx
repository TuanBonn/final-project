// // src/components/BuyProductDialog.tsx
// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Loader2, CreditCard, Truck, ShoppingCart, Wallet } from "lucide-react";
// import { useUser } from "@/contexts/UserContext";

// interface BuyProductDialogProps {
//   product: {
//     id: string;
//     name: string;
//     price: number;
//     status: string;
//     quantity: number;
//   };
// }

// export function BuyProductDialog({ product }: BuyProductDialogProps) {
//   const { user } = useUser();
//   const router = useRouter();
//   const [isOpen, setIsOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [paymentMethod, setPaymentMethod] = useState("cod");
//   const [buyQuantity, setBuyQuantity] = useState(1);

//   const formatCurrency = (amount: number) =>
//     new Intl.NumberFormat("vi-VN", {
//       style: "currency",
//       currency: "VND",
//     }).format(amount);

//   // Tính tổng tiền và kiểm tra số dư
//   const totalAmount = Number(product.price) * buyQuantity;
//   const userBalance = Number(user?.balance || 0);
//   const isBalanceEnough = userBalance >= totalAmount;

//   const handleBuy = async () => {
//     if (!user) {
//       router.push("/login");
//       return;
//     }

//     if (buyQuantity < 1 || buyQuantity > product.quantity) {
//       alert(`Vui lòng nhập số lượng hợp lệ (1 - ${product.quantity})`);
//       return;
//     }

//     // Validate Ví
//     if (paymentMethod === "wallet" && !isBalanceEnough) {
//       alert(
//         "Số dư ví không đủ. Vui lòng nạp thêm tiền hoặc chọn phương thức khác."
//       );
//       return;
//     }

//     setLoading(true);
//     try {
//       const res = await fetch("/api/transactions", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           productId: product.id,
//           paymentMethod: paymentMethod,
//           quantity: buyQuantity,
//         }),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         throw new Error(data.error || "Có lỗi xảy ra.");
//       }

//       alert("Đặt hàng thành công! Cảm ơn bạn đã ủng hộ.");
//       setIsOpen(false);
//       router.refresh();
//     } catch (error: any) {
//       alert(error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const isAvailable = product.status === "available" && product.quantity > 0;

//   if (!isAvailable) {
//     return (
//       <Button disabled variant="secondary" className="w-full md:w-auto">
//         Hết hàng / Ngừng bán
//       </Button>
//     );
//   }

//   return (
//     <Dialog open={isOpen} onOpenChange={setIsOpen}>
//       <DialogTrigger asChild>
//         <Button size="lg" className="w-full md:w-auto font-bold text-lg">
//           <ShoppingCart className="mr-2 h-5 w-5" />
//           Mua ngay
//         </Button>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-[450px]">
//         <DialogHeader>
//           <DialogTitle>Xác nhận mua hàng</DialogTitle>
//           <DialogDescription>
//             Sản phẩm: <strong>{product.name}</strong>
//           </DialogDescription>
//         </DialogHeader>

//         <div className="py-4 space-y-4">
//           {/* Chọn số lượng */}
//           <div className="flex items-center justify-between border p-3 rounded-md bg-muted/20">
//             <Label>Số lượng mua (Kho còn {product.quantity}):</Label>
//             <Input
//               type="number"
//               min="1"
//               max={product.quantity}
//               value={buyQuantity}
//               onChange={(e) => {
//                 const val = parseInt(e.target.value);
//                 if (!isNaN(val)) setBuyQuantity(val);
//               }}
//               className="w-20 text-center font-bold"
//             />
//           </div>

//           <div className="text-right font-bold text-lg text-primary">
//             Tổng tiền: {formatCurrency(totalAmount)}
//           </div>

//           <div className="space-y-3">
//             <h4 className="text-sm font-medium">Phương thức thanh toán:</h4>
//             <RadioGroup
//               value={paymentMethod}
//               onValueChange={setPaymentMethod}
//               className="gap-3"
//             >
//               {/* COD */}
//               <div className="flex items-center space-x-3 border p-3 rounded-md cursor-pointer hover:bg-accent">
//                 <RadioGroupItem value="cod" id="cod" />
//                 <Label
//                   htmlFor="cod"
//                   className="flex items-center cursor-pointer flex-1"
//                 >
//                   <Truck className="mr-2 h-4 w-4 text-green-600" />
//                   <div className="flex flex-col">
//                     <span>Thanh toán khi nhận hàng (COD)</span>
//                     <span className="text-xs text-muted-foreground">
//                       Trả tiền mặt cho shipper
//                     </span>
//                   </div>
//                 </Label>
//               </div>

//               {/* WALLET (MỚI) */}
//               <div
//                 className={`flex items-center space-x-3 border p-3 rounded-md cursor-pointer ${
//                   isBalanceEnough ? "hover:bg-accent" : "opacity-60 bg-gray-50"
//                 }`}
//               >
//                 <RadioGroupItem
//                   value="wallet"
//                   id="wallet"
//                   disabled={!isBalanceEnough}
//                 />
//                 <Label
//                   htmlFor="wallet"
//                   className="flex items-center cursor-pointer flex-1"
//                 >
//                   <Wallet className="mr-2 h-4 w-4 text-orange-600" />
//                   <div className="flex flex-col flex-1">
//                     <span>Ví điện tử</span>
//                     <span
//                       className={`text-xs ${
//                         isBalanceEnough ? "text-green-600" : "text-red-600"
//                       } font-medium`}
//                     >
//                       Số dư: {formatCurrency(userBalance)}
//                     </span>
//                   </div>
//                   {!isBalanceEnough && (
//                     <span className="text-[10px] text-red-500 font-bold ml-2">
//                       Không đủ
//                     </span>
//                   )}
//                 </Label>
//               </div>

//               {/* QR */}
//               <div className="flex items-center space-x-3 border p-3 rounded-md cursor-pointer hover:bg-accent">
//                 <RadioGroupItem value="banking_qr" id="qr" />
//                 <Label
//                   htmlFor="qr"
//                   className="flex items-center cursor-pointer flex-1"
//                 >
//                   <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
//                   <div className="flex flex-col">
//                     <span>Chuyển khoản ngân hàng (QR)</span>
//                     <span className="text-xs text-muted-foreground">
//                       Quét mã VietQR/VNPay
//                     </span>
//                   </div>
//                 </Label>
//               </div>
//             </RadioGroup>
//           </div>
//         </div>

//         <DialogFooter>
//           <Button
//             variant="outline"
//             onClick={() => setIsOpen(false)}
//             disabled={loading}
//           >
//             Hủy
//           </Button>
//           <Button onClick={handleBuy} disabled={loading}>
//             {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
//             Xác nhận mua
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

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
import { Input } from "@/components/ui/input";
import {
  Loader2,
  CreditCard,
  Truck,
  ShoppingCart,
  Wallet,
  Trophy,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface BuyProductDialogProps {
  product: {
    id: string;
    name: string;
    price: number;
    status: string;
    quantity: number;
  };
  // === THÊM 2 PROPS NÀY ===
  fixedPrice?: number; // Giá chốt (dùng cho đấu giá)
  auctionId?: string; // ID phiên đấu giá
  // ========================
}

export function BuyProductDialog({
  product,
  fixedPrice,
  auctionId,
}: BuyProductDialogProps) {
  const { user } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [buyQuantity, setBuyQuantity] = useState(1);

  const isAuction = !!auctionId;

  // Nếu là đấu giá, dùng giá chốt. Nếu không, dùng giá gốc.
  const finalPrice = fixedPrice || product.price;
  const totalAmount = finalPrice * buyQuantity;

  const userBalance = Number(user?.balance || 0);
  const isBalanceEnough = userBalance >= totalAmount;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

  const handleBuy = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!isAuction && (buyQuantity < 1 || buyQuantity > product.quantity)) {
      alert(`Vui lòng nhập số lượng hợp lệ (1 - ${product.quantity})`);
      return;
    }

    if (paymentMethod === "wallet" && !isBalanceEnough) {
      alert("Số dư ví không đủ. Vui lòng nạp thêm tiền.");
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
          quantity: buyQuantity,
          auctionId: auctionId, // Gửi thêm auctionId
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra.");
      }

      alert("Thanh toán thành công! Đơn hàng đã được tạo.");
      setIsOpen(false);
      router.push("/orders"); // Chuyển hướng về trang đơn hàng
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isAvailable = product.status === "available" && product.quantity > 0;

  // Nếu là đấu giá thì luôn hiện nút (logic ẩn hiện do trang cha quản lý)
  if (!isAvailable && !isAuction) {
    return (
      <Button disabled variant="secondary" className="w-full md:w-auto">
        Hết hàng / Ngừng bán
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className={`w-full md:w-auto font-bold text-lg ${
            isAuction ? "bg-green-600 hover:bg-green-700" : ""
          }`}
        >
          {isAuction ? (
            <Trophy className="mr-2 h-5 w-5" />
          ) : (
            <ShoppingCart className="mr-2 h-5 w-5" />
          )}
          {isAuction ? "Thanh toán & Nhận giải" : "Mua ngay"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isAuction ? "Xác nhận nhận giải" : "Xác nhận mua hàng"}
          </DialogTitle>
          <DialogDescription>
            Sản phẩm: <strong>{product.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Chọn số lượng (Ẩn nếu là đấu giá - mặc định 1) */}
          {!isAuction && (
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
                className="w-20 text-center font-bold"
              />
            </div>
          )}

          <div className="text-right font-bold text-lg text-primary">
            {isAuction ? "Giá thắng cuộc: " : "Tổng tiền: "}
            {formatCurrency(totalAmount)}
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
                  </div>
                </Label>
              </div>

              <div
                className={`flex items-center space-x-3 border p-3 rounded-md cursor-pointer ${
                  isBalanceEnough ? "hover:bg-accent" : "opacity-60 bg-gray-50"
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
                  <Wallet className="mr-2 h-4 w-4 text-orange-600" />
                  <div className="flex flex-col flex-1">
                    <span>Ví điện tử</span>
                    <span
                      className={`text-xs ${
                        isBalanceEnough ? "text-green-600" : "text-red-600"
                      } font-medium`}
                    >
                      Số dư: {formatCurrency(userBalance)}
                    </span>
                  </div>
                  {!isBalanceEnough && (
                    <span className="text-[10px] text-red-500 font-bold ml-2">
                      Không đủ
                    </span>
                  )}
                </Label>
              </div>
            </RadioGroup>
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
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
