// src/components/BidForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Gavel, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";

interface BidFormProps {
  auctionId: string;
  currentPrice: number;
  bidIncrement: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

export default function BidForm({
  auctionId,
  currentPrice,
  bidIncrement,
}: BidFormProps) {
  const { user } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState<number>(
    currentPrice + bidIncrement
  );
  const [loading, setLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Giả sử API check trạng thái tham gia của user (đã cọc hay chưa)
  // Để đơn giản, ở đây ta giả lập hoặc xử lý lỗi từ server trả về nếu chưa cọc.
  // Trong thực tế, nên có state `hasJoined` check từ API.

  const handlePlaceBid = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (bidAmount < currentPrice + bidIncrement) {
      setError(
        `Minimum bid must be ${formatCurrency(currentPrice + bidIncrement)}`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: bidAmount }),
      });

      const data = await res.json();

      if (res.status === 402) {
        // Mã 402: Payment Required (Chưa cọc hoặc hết tiền)
        setError(data.error); // "You must deposit to join this auction"
      } else if (!res.ok) {
        throw new Error(data.error || "Failed to place bid.");
      } else {
        alert("Bid placed successfully!");
        setIsOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinDeposit = async () => {
    setDepositLoading(true);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/join`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Deposit successful! You can now place bids.");
      setError(null); // Clear previous error
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDepositLoading(false);
    }
  };

  const minBid = currentPrice + bidIncrement;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full bg-purple-700 hover:bg-purple-800 text-lg py-6 font-bold shadow-md">
            <Gavel className="mr-2 h-5 w-5" /> Place Bid
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <Gavel className="h-5 w-5" /> Place a Bid
            </DialogTitle>
            <DialogDescription>
              Current Price: <strong>{formatCurrency(currentPrice)}</strong>
              <br />
              Min Bid Increment: {formatCurrency(bidIncrement)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4" /> Auction Error
                </div>
                <p>{error}</p>
                {error.includes("deposit") && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={handleJoinDeposit}
                    disabled={depositLoading}
                  >
                    {depositLoading && (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    )}
                    Pay Deposit (50.000 đ)
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bid-amount">Your Bid Amount (VND)</Label>
              <Input
                id="bid-amount"
                type="number"
                min={minBid}
                step={bidIncrement}
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="font-bold text-lg"
              />
              <p className="text-xs text-muted-foreground text-right">
                Minimum required: {formatCurrency(minBid)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handlePlaceBid} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
