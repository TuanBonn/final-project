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
  ShieldCheck,
} from "lucide-react";
import { BidForm } from "@/components/BidForm";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { useUser } from "@/contexts/UserContext";
import { BuyProductDialog } from "@/components/BuyProductDialog";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

// Component đếm ngược (Đã tích hợp hiển thị trạng thái Waiting)
const Countdown = ({
  targetDate,
  status,
  onExpire,
}: {
  targetDate: string;
  status: string;
  onExpire?: () => void;
}) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    // Ưu tiên hiển thị trạng thái đặc biệt
    if (status === "waiting") {
      setTimeLeft("CHỜ THANH TOÁN");
      return;
    }
    if (status === "ended") {
      setTimeLeft("ĐÃ KẾT THÚC");
      return;
    }
    if (status === "cancelled") {
      setTimeLeft("ĐÃ HỦY");
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;

      if (distance < 0) {
        setTimeLeft("ĐANG XỬ LÝ...");
        if (onExpire && status === "active") onExpire();
        return;
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
  }, [targetDate, status, onExpire]);

  return (
    <span
      className={`font-mono font-bold text-lg ${
        status === "waiting"
          ? "text-orange-600"
          : status === "active"
          ? "text-red-600"
          : "text-gray-500"
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
  const [auction, setAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const res = await fetch(`/api/auctions/${id}?t=${Date.now()}`);
        if (!res.ok) {
          if (res.status === 404) return;
          throw new Error("Lỗi tải dữ liệu");
        }
        const data = await res.json();
        setAuction(data.auction);
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

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`auction_room:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${id}`,
        },
        () => fetchData(true)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${id}`,
        },
        () => fetchData(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchData]);

  const handleJoinAuction = async () => {
    if (!user) return router.push("/login");
    if (!confirm("Phí tham gia 50,000 VND sẽ được trừ từ ví. Xác nhận?"))
      return;
    setJoining(true);
    try {
      const res = await fetch(`/api/auctions/${id}/join`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchData(true);
      } else {
        if (res.status === 402 && confirm("Số dư không đủ. Nạp tiền ngay?"))
          router.push("/wallet");
        else alert(data.error);
      }
    } catch (e) {
      alert("Lỗi tham gia.");
    } finally {
      setJoining(false);
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

  const isActive = auction.status === "active";
  const isWaiting = auction.status === "waiting";
  const isEnded = auction.status === "ended";
  const isCancelled = auction.status === "cancelled";

  const isWinner = user && auction.winning_bidder_id === user.id;
  const hasOrder = !!auction.orderId;

  return (
    <div className="container mx-auto py-6 max-w-5xl px-4">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/auctions">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
        {/* === CỘT TRÁI: ẢNH & THÔNG TIN === */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative">
            <ProductImageGallery
              images={auction.product.image_urls}
              productName={auction.product.name}
            />
            <div className="absolute top-4 right-4 z-10">
              <Badge
                className={
                  isActive
                    ? "bg-green-600 animate-pulse hover:bg-green-700"
                    : isWaiting
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-gray-500 hover:bg-gray-600"
                }
              >
                {isActive
                  ? "ĐANG DIỄN RA"
                  : isWaiting
                  ? "CHỜ THANH TOÁN"
                  : isCancelled
                  ? "ĐÃ HỦY"
                  : "ĐÃ KẾT THÚC"}
              </Badge>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-2 text-foreground">
              {auction.product.name}
            </h1>

            {/* Seller Info */}
            <div className="flex items-center gap-2 mb-4 bg-muted/30 p-3 rounded-lg border w-fit">
              <Link href={`/user/${auction.seller.username}`}>
                <Avatar className="h-8 w-8 border cursor-pointer hover:opacity-80">
                  <AvatarImage src={auction.seller.avatar_url || ""} />
                  <AvatarFallback>S</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Người bán</span>
                <Link
                  href={`/user/${auction.seller.username}`}
                  className="text-sm font-semibold hover:underline hover:text-primary"
                >
                  {auction.seller.username}
                </Link>
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
                    {auction.product.condition?.replace(/_/g, " ") || "Used"}
                  </Badge>
                </div>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {auction.product.description || "Không có mô tả."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* === CỘT PHẢI: HÀNH ĐỘNG & LỊCH SỬ === */}
        <div className="space-y-6 lg:col-span-1 self-start lg:sticky lg:top-24">
          <Card
            className={`border-2 shadow-lg bg-card z-20 ${
              isWinner && isWaiting
                ? "border-orange-500 ring-2 ring-orange-200" // Hiệu ứng cho người thắng khi chờ thanh toán
                : isWinner && isEnded
                ? "border-green-500"
                : "border-primary/20"
            }`}
          >
            <CardContent className="p-6 space-y-4">
              {/* Thời gian & Trạng thái */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Thời gian còn lại
                </p>
                <div className="flex items-center gap-2 bg-secondary/50 p-3 rounded-md border">
                  <Clock
                    className={`h-5 w-5 ${
                      isActive ? "text-red-500 animate-pulse" : "text-gray-500"
                    }`}
                  />
                  <Countdown
                    targetDate={auction.end_time}
                    status={auction.status}
                    onExpire={() => fetchData(true)}
                  />
                </div>
              </div>

              {/* Giá hiện tại */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Giá cao nhất hiện tại
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-primary">
                    {formatCurrency(auction.currentPrice)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Khởi điểm: {formatCurrency(auction.starting_bid)}
                </p>
              </div>

              <Separator />

              {/* --- KHU VỰC NÚT BẤM (ACTION) --- */}

              {/* 1. Đang diễn ra (Active) */}
              {isActive &&
                (!auction.isJoined ? (
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
                      Tham gia (Phí: 50k)
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">
                      * Phí tham gia sẽ không được hoàn lại nếu bạn tự ý hủy.
                    </p>
                  </div>
                ) : (
                  <BidForm
                    auctionId={auction.id}
                    currentPrice={auction.currentPrice}
                    onSuccess={() => fetchData(true)}
                  />
                ))}

              {/* 2. Chờ thanh toán (Waiting) */}
              {isWaiting &&
                (isWinner ? (
                  <div className="space-y-3 animate-in zoom-in duration-300">
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg text-center">
                      <Trophy className="h-8 w-8 text-orange-600 mx-auto mb-1" />
                      <h3 className="font-bold text-orange-800 text-sm">
                        CHÚC MỪNG BẠN ĐÃ THẮNG!
                      </h3>
                      <p className="text-xs text-orange-700">
                        Vui lòng thanh toán để hoàn tất.
                      </p>
                    </div>

                    {/* Nút thanh toán (Dialog) */}
                    <BuyProductDialog
                      product={{
                        id: auction.product.id,
                        name: auction.product.name,
                        price: auction.currentPrice,
                        status: "auction", // status giả định để pass validation
                        quantity: 1,
                      }}
                      fixedPrice={auction.currentPrice}
                      auctionId={auction.id} // Quan trọng để backend xử lý
                    />
                  </div>
                ) : (
                  <Button disabled variant="secondary" className="w-full py-6">
                    Đã kết thúc (Chờ thanh toán)
                  </Button>
                ))}

              {/* 3. Đã kết thúc (Ended - Có đơn hàng) */}
              {isEnded && (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <h3 className="font-bold text-green-800 text-sm">
                      GIAO DỊCH HOÀN TẤT
                    </h3>
                  </div>
                  {isWinner && (
                    <Button
                      asChild
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Link href="/orders">Xem đơn hàng của bạn</Link>
                    </Button>
                  )}
                </div>
              )}

              {/* 4. Đã hủy (Cancelled) */}
              {isCancelled && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center text-red-800">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                  <span className="font-bold">PHIÊN ĐẤU GIÁ ĐÃ BỊ HỦY</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lịch sử đấu giá */}
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" /> Lịch sử đấu giá
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auction.bids.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Chưa có lượt đặt giá nào.
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                  {auction.bids.map((bid: any, index: number) => (
                    <div
                      key={bid.id}
                      className={`flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${
                        index === 0 ? "bg-yellow-50/50" : ""
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
                        <Link href={`/user/${bid.bidder.username}`}>
                          <Avatar className="h-8 w-8 border cursor-pointer hover:opacity-80">
                            <AvatarImage src={bid.bidder.avatar_url || ""} />
                            <AvatarFallback>
                              <UserIcon className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div>
                          <Link
                            href={`/user/${bid.bidder.username}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {bid.bidder.username}
                          </Link>
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
