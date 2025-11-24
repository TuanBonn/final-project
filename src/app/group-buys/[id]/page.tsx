// src/app/group-buys/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Users,
  Clock,
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { useUser } from "@/contexts/UserContext";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

const getTimeLeft = (deadline: string) => {
  const diff = new Date(deadline).getTime() - new Date().getTime();
  if (diff < 0) return "Đã kết thúc";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} ngày nữa`;
};

export default function GroupBuyDetailPage() {
  const { id } = useParams();
  const { user } = useUser();
  const router = useRouter();
  const [groupBuy, setGroupBuy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joinQuantity, setJoinQuantity] = useState("1");
  const [isJoining, setIsJoining] = useState(false);

  const fetchGroupBuy = useCallback(async () => {
    try {
      const res = await fetch(`/api/group-buys/${id}`);
      if (!res.ok) throw new Error("Lỗi tải");
      const data = await res.json();
      setGroupBuy(data.groupBuy);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGroupBuy();
  }, [fetchGroupBuy]);

  const handleJoin = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    const qty = parseInt(joinQuantity);
    if (qty < 1) return alert("Số lượng tối thiểu là 1");

    setIsJoining(true);
    try {
      const res = await fetch(`/api/group-buys/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Tham gia thành công!");
      fetchGroupBuy(); // Refresh lại số lượng
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsJoining(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10" />
      </div>
    );
  if (!groupBuy)
    return <div className="text-center py-20">Kèo không tồn tại.</div>;

  const isOpen = groupBuy.status === "open";

  return (
    <div className="container mx-auto py-6 max-w-5xl px-4">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/group-buys">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT TRÁI: ẢNH & THÔNG TIN */}
        <div className="lg:col-span-2 space-y-6">
          <ProductImageGallery
            images={groupBuy.product_images}
            productName={groupBuy.product_name}
          />

          <div>
            <h1 className="text-3xl font-bold mb-2">{groupBuy.product_name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Avatar className="h-6 w-6">
                <AvatarImage src={groupBuy.host.avatar_url} />
                <AvatarFallback>H</AvatarFallback>
              </Avatar>
              <span className="text-sm">
                Host:{" "}
                <strong className="text-foreground">
                  {groupBuy.host.username}
                </strong>
              </span>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chi tiết kèo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">
                  {groupBuy.product_description}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CỘT PHẢI: THAM GIA */}
        <div className="space-y-6">
          <Card className="border-orange-200 bg-orange-50/30 shadow-lg sticky top-24">
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Giá mua chung
                </p>
                <p className="text-4xl font-bold text-orange-600">
                  {formatCurrency(Number(groupBuy.price_per_unit))}
                </p>
              </div>

              {/* --- ĐÃ SỬA: TIẾN ĐỘ GỌN GÀNG HƠN (BỎ THANH PROGRESS) --- */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium bg-white text-orange-800 px-3 py-2 rounded-md border border-orange-100 w-fit shadow-sm">
                  <Users className="h-4 w-4" />
                  <span>
                    Tiến độ: {groupBuy.currentQuantity} /{" "}
                    {groupBuy.target_quantity}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Hạn chót:{" "}
                    <span className="font-medium text-foreground">
                      {getTimeLeft(groupBuy.join_deadline)}
                    </span>
                  </span>
                </div>
              </div>
              {/* ------------------------------------------------------- */}

              {isOpen ? (
                <div className="space-y-3 pt-4 border-t border-orange-200 mt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium whitespace-nowrap">
                      Số lượng:
                    </span>
                    <Input
                      type="number"
                      min="1"
                      value={joinQuantity}
                      onChange={(e) => setJoinQuantity(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <Button
                    onClick={handleJoin}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6"
                    disabled={isJoining}
                  >
                    {isJoining ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <ShoppingBag className="mr-2 h-5 w-5" />
                    )}
                    Tham Gia Ngay
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    * Bạn cần thanh toán khi Host chốt kèo.
                  </p>
                </div>
              ) : (
                <Button
                  disabled
                  className="w-full py-6 text-lg"
                  variant="secondary"
                >
                  Kèo đã đóng / Kết thúc
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Danh sách người tham gia */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                Danh sách tham gia ({groupBuy.participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                {groupBuy.participants.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={p.user.avatar_url} />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <span>{p.user.username}</span>
                    </div>
                    <Badge variant="outline">x{p.quantity}</Badge>
                  </div>
                ))}
                {groupBuy.participants.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm">
                    Chưa có ai tham gia.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
