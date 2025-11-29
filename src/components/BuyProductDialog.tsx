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
  Truck,
  ShoppingCart,
  Wallet,
  Trophy,
  Info,
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
  fixedPrice?: number;
  auctionId?: string;
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

  const isAuction = !!auctionId;
  const [paymentMethod, setPaymentMethod] = useState(
    isAuction ? "wallet" : "cod"
  );
  const [buyQuantity, setBuyQuantity] = useState(1);

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
      alert(`Please enter a valid quantity (1 - ${product.quantity})`);
      return;
    }

    if (paymentMethod === "wallet" && !isBalanceEnough) {
      alert("Insufficient wallet balance. Please deposit more funds.");
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
          auctionId: auctionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error occurred.");
      }

      alert("Payment successful! Order created.");
      setIsOpen(false);
      router.push("/orders");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isAvailable = product.status === "available" && product.quantity > 0;

  if (!isAvailable && !isAuction) {
    return (
      <Button disabled variant="secondary" className="w-full md:w-auto">
        Out of Stock / Stopped
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
          {isAuction ? "Pay & Claim Reward" : "Buy Now"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isAuction ? "Confirm Reward Claim" : "Confirm Purchase"}
          </DialogTitle>
          <DialogDescription>
            Product: <strong>{product.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!isAuction && (
            <div className="flex items-center justify-between border p-3 rounded-md bg-muted/20">
              <Label>Quantity (Stock: {product.quantity}):</Label>
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
            {isAuction ? "Winning Price: " : "Total Amount: "}
            {formatCurrency(totalAmount)}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Payment Method:</h4>

            {isAuction && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md text-xs flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Auction rule: wallet payment is mandatory for security.
                </span>
              </div>
            )}

            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="gap-3"
            >
              {!isAuction && (
                <div className="flex items-center space-x-3 border p-3 rounded-md cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="cod" id="cod" />
                  <Label
                    htmlFor="cod"
                    className="flex items-center cursor-pointer flex-1"
                  >
                    <Truck className="mr-2 h-4 w-4 text-green-600" />
                    <div className="flex flex-col">
                      <span>Cash on Delivery (COD)</span>
                    </div>
                  </Label>
                </div>
              )}

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
                    <span>E-Wallet</span>
                    <span
                      className={`text-xs ${
                        isBalanceEnough ? "text-green-600" : "text-red-600"
                      } font-medium`}
                    >
                      Balance: {formatCurrency(userBalance)}
                    </span>
                  </div>
                  {!isBalanceEnough && (
                    <span className="text-[10px] text-red-500 font-bold ml-2">
                      Insufficient
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
            Cancel
          </Button>
          <Button
            onClick={handleBuy}
            disabled={
              loading || (paymentMethod === "wallet" && !isBalanceEnough)
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
