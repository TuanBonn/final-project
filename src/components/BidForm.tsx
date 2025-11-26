// src/components/BidForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Gavel } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface BidFormProps {
  auctionId: string;
  currentPrice: number;
  minStep?: number;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

export function BidForm({
  auctionId,
  currentPrice,
  minStep = 10000,
}: BidFormProps) {
  const { user } = useUser();
  const router = useRouter();
  const [bidAmount, setBidAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const nextMinBid = currentPrice + minStep;

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }

    const amount = parseInt(bidAmount.replace(/\D/g, ""), 10);
    if (isNaN(amount) || amount < nextMinBid) {
      alert(
        `Giá phải cao hơn hiện tại tối thiểu ${formatCurrency(
          minStep
        )} (Tức là >= ${formatCurrency(nextMinBid)})`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("🎉 Chúc mừng! Bạn đang là người trả giá cao nhất.");
      setBidAmount("");
      // Không cần router.refresh() vì Realtime ở trang cha sẽ tự cập nhật UI
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm mt-6">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        <Gavel className="h-5 w-5 text-primary" /> Tham gia đấu giá
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Giá đặt tiếp theo tối thiểu:{" "}
        <strong className="text-foreground text-lg text-green-600">
          {formatCurrency(nextMinBid)}
        </strong>
      </p>

      <form onSubmit={handleBid} className="flex gap-2">
        <Input
          placeholder="Nhập giá muốn mua..."
          className="flex-1 font-mono text-lg"
          value={bidAmount}
          onChange={(e) =>
            setBidAmount(
              new Intl.NumberFormat("vi-VN").format(
                parseInt(e.target.value.replace(/\D/g, "") || "0")
              )
            )
          }
        />
        <Button
          type="submit"
          disabled={loading || !bidAmount}
          size="lg"
          className="bg-primary hover:bg-primary/90"
        >
          {loading ? (
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
          ) : (
            "Đặt giá"
          )}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-2 italic">
        * Bạn cần chịu trách nhiệm với mức giá mình đưa ra.
      </p>
    </div>
  );
}
