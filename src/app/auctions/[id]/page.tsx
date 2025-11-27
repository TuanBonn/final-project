// src/app/auctions/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
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
  Wallet,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { BidForm } from "@/components/BidForm";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { useUser } from "@/contexts/UserContext";
import { BuyProductDialog } from "@/components/BuyProductDialog";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Bid {
  id: string;
  bid_amount: number;
  created_at: string;
  bidder: { username: string; avatar_url: string | null };
}

interface AuctionDetail {
  id: string;
  product_id: string;
  status: string;
  starting_bid: number;
  currentPrice: number;
  start_time: string;
  end_time: string;
  winning_bidder_id: string | null;
  isJoined: boolean;
  orderId: string | null; // ID đơn hàng nếu đã tạo
  product: {
    id: string;
    name: string;
    description: string;
    image_urls: string[] | null;
    condition: string;
    quantity: number;
  };
  seller: {
    id: string;
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

// Component Countdown
const Countdown = ({
  targetDate,
  onExpire,
}: {
  targetDate: string;
  onExpire?: () => void;
}) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;

      if (distance < 0) {
        setTimeLeft("ĐANG CHỐT...");
        if (!isExpired) {
          setIsExpired(true);
          if (onExpire) onExpire();
        }
        return;
      }
      if (isExpired && distance > 0) {
        setIsExpired(false);
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpire, isExpired]);

  return (
    <span
      className={`font-mono font-bold text-lg ${
        isExpired ? "text-gray-500" : "text-red-600"
      }`}
    >
      {timeLeft}
    </span>
  );
};

export default function AuctionDetailPage() {
  const { id } = useParams();
  const { user } = useUser();
  const router = useRouter();
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Ref để tránh stale closure trong setInterval
  const auctionRef = useRef(auction);
  useEffect(() => {
    auctionRef.current = auction;
  }, [auction]);

  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        // Thêm timestamp để tránh cache
        const res = await fetch(
          `/api/auctions/${id}?t=${new Date().getTime()}`
        );
        if (!res.ok) {
          if (res.status === 404) return;
          throw new Error("Lỗi tải");
        }
        const data = await res.json();

        // Cập nhật state nếu có dữ liệu mới
        setAuction((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(data.auction)) {
            return data.auction;
          }
          return prev;
        });
      } catch (error) {
        console.error(error);
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling fallback (mỗi 3s nếu đang active)
  useEffect(() => {
    const interval = setInterval(() => {
      if (auctionRef.current?.status === "active") {
        fetchData(true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Realtime listener
  useEffect(() => {
    if (!id) return;
    console.log("Listening to realtime channel:", `auction_room:${id}`);
    const channel = supabase
      .channel(`auction_room:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Nghe mọi sự kiện
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${id}`,
        },
        () => {
          console.log("New bid! Refreshing...");
          fetchData(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log("Auction updated!", payload);
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchData]);

  const handleJoinAuction = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (
      !confirm("Bạn sẽ bị trừ phí tham gia (50.000đ) từ ví. Xác nhận tham gia?")
    )
      return;

    setJoining(true);
    try {
      const res = await fetch(`/api/auctions/${id}/join`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        fetchData(true);
      } else {
        if (res.status === 402) {
          if (confirm("Số dư không đủ. Bạn có muốn nạp tiền ngay?")) {
            router.push("/wallet");
          }
        } else {
          alert(data.error);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi khi tham gia.");
    } finally {
      setJoining(false);
    }
  };

  const handleFinalize = async () => {
    if (auction && auction.status === "active") {
      setFinalizing(true);
      try {
        const res = await fetch(`/api/auctions/${id}/finalize`, {
          method: "POST",
        });
        if (res.ok) fetchData();
      } catch (e) {
        console.error(e);
      } finally {
        setFinalizing(false);
      }
    }
  };

  if (loading && !auction)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10" />
      </div>
    );

  if (!auction)
    return (
      <div className="text-center py-20">Không tìm thấy phiên đấu giá.</div>
    );

  const isEnded = auction.status === "ended" || auction.status === "cancelled";
  const topBid =
    auction.bids && auction.bids.length > 0 ? auction.bids[0] : null;

  const isWinner =
    user &&
    ((isEnded && auction.winning_bidder_id === user.id) ||
      (!isEnded &&
        topBid?.bidder.username === user.username &&
        new Date() > new Date(auction.end_time)));

  const paymentDeadline = new Date(
    new Date(auction.end_time).getTime() + 24 * 60 * 60 * 1000
  );

  // Kiểm tra đã có đơn hàng chưa
  const hasOrder = !!auction.orderId;

  return (
    <div className="container mx-auto py-6 max-w-5xl px-4">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/auctions">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại sàn đấu giá
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
        {/* Cột Trái: Thông tin sản phẩm */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative">
            <ProductImageGallery
              images={auction.product.image_urls}
              productName={auction.product.name}
            />
            <div className="absolute top-4 right-4 z-10">
              <Badge
                className={
                  !isEnded
                    ? "bg-green-600 hover:bg-green-700 animate-pulse"
                    : "bg-gray-500"
                }
              >
                {!isEnded ? "ĐANG DIỄN RA" : "ĐÃ KẾT THÚC"}
              </Badge>
            </div>
          </div>

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

        {/* Cột Phải: Điều khiển Đấu giá */}
        <div className="space-y-6 lg:col-span-1 self-start lg:sticky lg:top-24">
          <Card
            className={`border-2 shadow-lg bg-card z-20 ${
              isWinner && isEnded
                ? "border-green-500 ring-2 ring-green-200"
                : "border-primary/20"
            }`}
          >
            <CardContent className="p-6 space-y-4">
              {/* Thời gian */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Thời gian còn lại
                </p>
                <div className="flex items-center gap-2 bg-secondary/50 p-3 rounded-md border">
                  <Clock
                    className={`h-5 w-5 ${
                      isEnded ? "text-gray-500" : "text-red-500 animate-pulse"
                    }`}
                  />
                  {isEnded ? (
                    <span className="font-bold text-gray-600">ĐÃ KẾT THÚC</span>
                  ) : (
                    <Countdown
                      targetDate={auction.end_time}
                      onExpire={handleFinalize}
                    />
                  )}
                </div>
              </div>

              {/* Giá */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Giá cao nhất hiện tại
                </p>
                <div className="flex items-baseline gap-2">
                  <p
                    className="text-4xl font-bold text-primary animate-in fade-in slide-in-from-bottom-2 duration-300"
                    key={auction.currentPrice}
                  >
                    {formatCurrency(auction.currentPrice)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Khởi điểm: {formatCurrency(auction.starting_bid)}
                </p>
              </div>

              <Separator />

              {/* Khu vực Hành động */}
              {isWinner && isEnded ? (
                <div className="space-y-4 animate-in zoom-in duration-500">
                  <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 text-center shadow-sm">
                    <div className="flex justify-center mb-2">
                      <div className="bg-yellow-100 p-2 rounded-full">
                        <Trophy className="h-8 w-8 text-yellow-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-green-800 mb-1">
                      CHÚC MỪNG BẠN ĐÃ THẮNG!
                    </h3>

                    {/* Chỉ hiện hạn thanh toán nếu CHƯA có đơn hàng */}
                    {!hasOrder && (
                      <div className="bg-white p-3 rounded-lg border border-green-200 text-sm text-muted-foreground mt-3">
                        <p className="mb-1 flex items-center justify-center gap-1 text-red-600 font-medium">
                          <AlertCircle className="h-4 w-4" /> Hạn chót thanh
                          toán:
                        </p>
                        <p className="font-bold text-foreground text-lg">
                          {paymentDeadline.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          - {paymentDeadline.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* LOGIC ẨN NÚT MUA NẾU ĐÃ CÓ ĐƠN */}
                  {hasOrder ? (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-bold shadow-md"
                      asChild
                    >
                      <Link href="/orders">
                        <CheckCircle className="mr-2 h-5 w-5" /> Đơn hàng đã
                        được tạo
                      </Link>
                    </Button>
                  ) : (
                    <BuyProductDialog
                      product={{
                        id: auction.product.id,
                        name: auction.product.name,
                        price: auction.currentPrice,
                        status: "in_transaction",
                        quantity: 1, // Đấu giá thường là 1 sản phẩm
                      }}
                      fixedPrice={auction.currentPrice}
                      auctionId={auction.id}
                    />
                  )}
                </div>
              ) : isEnded && !isWinner ? (
                <Button
                  disabled
                  variant="secondary"
                  className="w-full py-6 text-lg"
                >
                  Phiên đấu giá đã kết thúc
                </Button>
              ) : !isEnded ? (
                // Đang diễn ra
                !auction.isJoined ? (
                  <div className="space-y-2">
                    <Button
                      onClick={handleJoinAuction}
                      className="w-full py-6 text-lg bg-orange-600 hover:bg-orange-700 shadow-md"
                      disabled={joining}
                    >
                      {joining ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Wallet className="mr-2 h-5 w-5" />
                      )}
                      Tham gia đấu giá
                    </Button>
                    <p className="text-xs text-center text-muted-foreground bg-orange-50 p-2 rounded border border-orange-100">
                      Phí tham gia: <strong>50.000đ</strong> (Trừ vào ví)
                      <br />
                      <em>Phí này không hoàn lại</em>
                    </p>
                  </div>
                ) : (
                  <BidForm
                    auctionId={auction.id}
                    currentPrice={auction.currentPrice}
                    onSuccess={() => fetchData(true)}
                  />
                )
              ) : null}
            </CardContent>
          </Card>

          {/* Lịch sử */}
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" /> Lịch sử đặt giá
                {!isEnded && (
                  <span className="text-xs font-normal text-muted-foreground ml-auto flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live
                  </span>
                )}
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
                      className={`flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 transition-colors animate-in slide-in-from-top-2 duration-300 ${
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
