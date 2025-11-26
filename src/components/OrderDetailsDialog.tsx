// src/components/OrderDetailsDialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, User } from "lucide-react";

interface ShippingAddress {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
}

interface OrderDetailsDialogProps {
  shippingAddress: ShippingAddress | null;
  buyerName: string;
}

export function OrderDetailsDialog({
  shippingAddress,
  buyerName,
}: OrderDetailsDialogProps) {
  if (!shippingAddress) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <MapPin className="h-4 w-4" /> Xem địa chỉ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Thông tin giao hàng</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Người nhận
              </p>
              <p className="font-semibold text-base">
                {shippingAddress.fullName || buyerName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
            <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Số điện thoại
              </p>
              <p className="font-semibold text-base">
                {shippingAddress.phone || "Không có SĐT"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Địa chỉ nhận hàng
              </p>
              <p className="text-base">
                {shippingAddress.address || "Chưa cập nhật"}
                {shippingAddress.city ? `, ${shippingAddress.city}` : ""}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
