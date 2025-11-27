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
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  Check,
  X,
  Settings,
  AlertTriangle,
  ExternalLink, // Icon mới
} from "lucide-react";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { useUser } from "@/contexts/UserContext";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

export default function GroupBuyDetailPage() {
  const { id } = useParams();
  const { user } = useUser();
  const router = useRouter();

  const [groupBuy, setGroupBuy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joinQuantity, setJoinQuantity] = useState("1");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchGroupBuy = useCallback(async () => {
    try {
      const res = await fetch(`/api/group-buys/${id}`);
      if (!res.ok) throw new Error("Lỗi tải dữ liệu");
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

  // --- HOST CHỐT KÈO / HỦY KÈO ---
  const handleHostStatusChange = async (newStatus: "successful" | "failed") => {
    const confirmMsg =
      newStatus === "successful"
        ? "Xác nhận CHỐT KÈO THÀNH CÔNG? \n\nHệ thống sẽ TỰ ĐỘNG TẠO ĐƠN HÀNG cho tất cả người tham gia vào mục 'Quản lý đơn hàng'."
        : "Xác nhận HỦY KÈO? \n\nHệ thống sẽ hoàn tiền 100%.";

    if (!confirm(confirmMsg)) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/admin/group-buys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      alert("Thành công! Các đơn hàng đã được tạo.");
      fetchGroupBuy();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- KHÁCH THAM GIA ---
  const handleJoin = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    const qty = parseInt(joinQuantity);
    if (qty < 1) return alert("Số lượng tối thiểu là 1");

    const total = qty * Number(groupBuy.price_per_unit);
    if (!confirm(`Xác nhận tham gia? Trừ ${formatCurrency(total)} vào ví.`))
      return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/group-buys/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 && confirm("Số dư thiếu. Nạp tiền?"))
          router.push("/wallet");
        else alert(data.error);
        return;
      }
      alert("Tham gia thành công!");
      fetchGroupBuy();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsActionLoading(false);
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
  const isSuccessful = groupBuy.status === "successful"; // Đã tạo đơn hàng
  const isFailed = groupBuy.status === "failed";

  const isHost = user && groupBuy.host.id === user.id;
  const myParticipation = user
    ? groupBuy.participants.find((p: any) => p.user.id === user.id)
    : null;
  const hasJoined = !!myParticipation;

  return (
    <div className="container mx-auto py-6 max-w-5xl px-4">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/group-buys">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT TRÁI */}
        <div className="lg:col-span-2 space-y-6">
          <ProductImageGallery
            images={groupBuy.product_images}
            productName={groupBuy.product_name}
          />

          <div>
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-bold mb-2">
                {groupBuy.product_name}
              </h1>
              <Badge
                className={
                  isOpen
                    ? "bg-blue-600"
                    : isSuccessful
                    ? "bg-green-600"
                    : "bg-red-600"
                }
              >
                {isOpen
                  ? "Đang Gom"
                  : isSuccessful
                  ? "Đã Chốt & Tạo Đơn"
                  : "Đã Hủy"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Avatar className="h-6 w-6">
                <AvatarImage src={groupBuy.host.avatar_url} />
                <AvatarFallback>H</AvatarFallback>
              </Avatar>
              <span className="text-sm">
                Host: <strong>{groupBuy.host.username}</strong>
              </span>
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

        {/* CỘT PHẢI */}
        <div className="space-y-6">
          {/* PANEL QUẢN LÝ HOST */}
          {isHost && isOpen && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Settings className="h-5 w-5" /> Quản lý Kèo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-blue-700">
                  Đủ số lượng? Chốt ngay để hệ thống{" "}
                  <strong>tự động tạo đơn hàng</strong> cho tất cả người tham
                  gia.
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleHostStatusChange("successful")}
                    disabled={isActionLoading}
                  >
                    <Check className="mr-2 h-4 w-4" /> Chốt Kèo
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleHostStatusChange("failed")}
                    disabled={isActionLoading}
                  >
                    <X className="mr-2 h-4 w-4" /> Hủy Kèo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-orange-200 bg-orange-50/30 shadow-lg">
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Giá mua chung
                </p>
                <p className="text-4xl font-bold text-orange-600">
                  {formatCurrency(Number(groupBuy.price_per_unit))}
                </p>
              </div>

              {/* THÔNG BÁO KHI THÀNH CÔNG */}
              {isSuccessful && (
                <div className="bg-green-100 border border-green-300 text-green-800 p-4 rounded-md">
                  <p className="font-bold flex items-center gap-2">
                    <Check className="h-5 w-5" /> Kèo đã được chốt!
                  </p>
                  <p className="text-sm mt-1">
                    Hệ thống đã tạo đơn hàng. Vui lòng kiểm tra trong mục{" "}
                    <strong>Quản lý đơn hàng</strong> để theo dõi vận chuyển.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full border-green-600 text-green-700 hover:bg-green-200"
                    asChild
                  >
                    <Link href="/orders">
                      <ExternalLink className="mr-2 h-4 w-4" /> Đến trang Đơn
                      hàng
                    </Link>
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm font-medium bg-white text-orange-800 px-3 py-2 rounded-md border border-orange-100 w-fit shadow-sm">
                <Users className="h-4 w-4" />
                <span>
                  Đã đăng ký: {groupBuy.currentQuantity} /{" "}
                  {groupBuy.target_quantity}
                </span>
              </div>

              {/* Nút Tham gia */}
              {isOpen && !isHost && !hasJoined && (
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
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <ShoppingBag className="mr-2 h-5 w-5" />
                    )}{" "}
                    Đặt Cọc Tham Gia
                  </Button>
                </div>
              )}

              {hasJoined && isOpen && (
                <div className="bg-blue-100 text-blue-800 p-3 rounded-md text-center text-sm font-medium border border-blue-200">
                  Bạn đang tham gia kèo này. Chờ Host chốt nhé!
                </div>
              )}
            </CardContent>
          </Card>

          {/* DANH SÁCH THAM GIA */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Danh sách tham gia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                {groupBuy.participants.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm">
                    Chưa có ai tham gia.
                  </p>
                )}
                {groupBuy.participants.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.user.avatar_url} />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{p.user.username}</p>
                        <p className="text-xs text-muted-foreground">
                          SL: {p.quantity}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Đã cọc</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
