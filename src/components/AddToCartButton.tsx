"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_urls: string[] | null;
    seller: { username: string | null };
    quantity: number; // Nhận thêm tồn kho
  };
  disabled?: boolean;
}

export function AddToCartButton({ product, disabled }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    if (quantity < 1) return;
    if (quantity > product.quantity) {
      alert(`Kho chỉ còn ${product.quantity} sản phẩm.`);
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_urls?.[0] || null,
      sellerName: product.seller.username || "Shop",
      quantity: quantity, // Thêm số lượng
      maxQuantity: product.quantity, // Lưu max để validate trong giỏ
    });
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="secondary"
        className="w-full border-primary/20 border text-primary hover:bg-primary/10"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      >
        <ShoppingCart className="mr-2 h-5 w-5" />
        Thêm vào giỏ
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Thêm vào giỏ hàng</DialogTitle>
          </DialogHeader>

          <div className="py-4 flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium">{product.name}</p>
              <p className="text-muted-foreground">
                Kho còn: {product.quantity}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                value={quantity}
                min={1}
                max={product.quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) setQuantity(val);
                }}
                className="w-14 h-8 text-center"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setQuantity(Math.min(product.quantity, quantity + 1))
                }
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddToCart}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
