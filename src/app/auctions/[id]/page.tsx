// src/app/auctions/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Clock,
  ArrowLeft,
  Trophy,
  User as UserIcon,
} from "lucide-react";
import { BidForm } from "@/components/BidForm";
import { ProductImageGallery } from "@/components/ProductImageGallery";

interface Bid {
  id: string;
  bid_amount: number;
  created_at: string;
  bidder: { username: string; avatar_url: string | null };
}

interface AuctionDetail {
  id: string;
  status: string;
  starting_bid: number;
  currentPrice: number;
  start_time: string;
  end_time: string;
  product: {
    name: string;
    description: string;
    image_urls: string[] | null;
    condition: string;
  };
  seller: {
    username: string;
    avatar_url: string | null;
    reputation_score: number;
  };
  bids: Bid[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

const Countdown = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;

      if (distance < 0) {
        setTimeLeft("ĐÃ KẾT THÚC");
        clearInterval(interval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <span className="font-mono font-bold text-red-600 text-lg">{timeLeft}</span>
  );
};

export default function AuctionDetailPage() {
  const { id } = useParams();
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${id}`);
      if (!res.ok) throw new Error("Lỗi tải");
      const data = await res.json();
      setAuction(data.auction);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10" />
      </div>
    );
  if (!auction)
    return (
      <div className="text-center py-20">Không tìm thấy phiên đấu giá.</div>
    );

  return (
    <div className="container mx-auto py-6 max-w-5xl px-4">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/auctions">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại sàn đấu giá
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
        {/* === CỘT TRÁI: ẢNH & THÔNG TIN SP (Chiếm 2 phần) === */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. GALLERY ẢNH */}
          <div className="relative">
            <ProductImageGallery
              images={auction.product.image_urls}
              productName={auction.product.name}
            />
            <div className="absolute top-4 right-4 z-10">
              <Badge
                className={
                  auction.status === "active"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-500"
                }
              >
                {auction.status === "active"
                  ? "ĐANG DIỄN RA"
                  : auction.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* 2. Thông tin chi tiết */}
          <div>
            <h1 className="text-3xl font-bold mb-2 text-foreground">
              {auction.product.name}
            </h1>

            <div className="flex items-center gap-2 mb-4 bg-muted/30 p-3 rounded-lg border w-fit">
              <Avatar className="h-8 w-8 border">
                <AvatarImage src={auction.seller.avatar_url || ""} />
                <AvatarFallback>S</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Chủ phiên</span>
                <span className="text-sm font-semibold">
                  {auction.seller.username}
                </span>
              </div>
              <div className="h-8 w-px bg-border mx-2"></div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Uy tín</span>
                <span className="text-sm font-bold text-blue-600">
                  {auction.seller.reputation_score}
                </span>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mô tả & Tình trạng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Badge
                    variant="outline"
                    className="text-sm py-1 px-3 capitalize"
                  >
                    Tình trạng: {auction.product.condition.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {auction.product.description || "Không có mô tả."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* === CỘT PHẢI: ĐẤU GIÁ & LỊCH SỬ (Chiếm 1 phần) === */}
        {/* Thêm 'self-start' để sticky hoạt động đúng trong grid */}
        <div className="space-y-6 lg:col-span-1 self-start lg:sticky lg:top-24">
          {/* Box Thông tin giá & Thời gian */}
          <Card className="border-2 border-primary/20 shadow-lg bg-card z-20">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Thời gian còn lại
                </p>
                <div className="flex items-center gap-2 bg-secondary/50 p-3 rounded-md border">
                  <Clock className="h-5 w-5 text-red-500 animate-pulse" />
                  <Countdown targetDate={auction.end_time} />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Giá cao nhất hiện tại
                </p>
                <p className="text-4xl font-bold text-primary">
                  {formatCurrency(auction.currentPrice)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Khởi điểm: {formatCurrency(auction.starting_bid)}
                </p>
              </div>

              <Separator />

              {/* FORM ĐẶT GIÁ */}
              {auction.status === "active" ? (
                <BidForm
                  auctionId={auction.id}
                  currentPrice={auction.currentPrice}
                />
              ) : (
                <Button
                  disabled
                  variant="secondary"
                  className="w-full py-6 text-lg"
                >
                  Phiên đấu giá đã kết thúc
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Lịch sử đấu giá */}
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" /> Lịch sử đặt giá
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auction.bids.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Chưa có ai đặt giá.
                  <br />
                  Hãy là người đầu tiên!
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                  {auction.bids.map((bid, index) => (
                    <div
                      key={bid.id}
                      className={`flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${
                        index === 0
                          ? "bg-yellow-50/50 dark:bg-yellow-900/10"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`font-bold text-sm w-6 text-center ${
                            index === 0
                              ? "text-yellow-600 text-lg"
                              : "text-muted-foreground"
                          }`}
                        >
                          {index === 0 ? "🥇" : `#${index + 1}`}
                        </div>
                        <Avatar className="h-8 w-8 border">
                          <AvatarImage src={bid.bidder.avatar_url || ""} />
                          <AvatarFallback>
                            <UserIcon className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {bid.bidder.username}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(bid.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`font-bold text-sm ${
                          index === 0 ? "text-green-600" : ""
                        }`}
                      >
                        {formatCurrency(Number(bid.bid_amount))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
