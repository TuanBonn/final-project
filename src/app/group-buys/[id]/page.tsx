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
  Truck,
  PackageCheck,
  AlertTriangle,
  Check,
  X,
  Settings,
} from "lucide-react";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { useUser } from "@/contexts/UserContext";
import { OrderDetailsDialog } from "@/components/OrderDetailsDialog";

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

  // --- 1. HOST CHỐT KÈO / HỦY KÈO ---
  const handleHostStatusChange = async (newStatus: "successful" | "failed") => {
    const confirmMsg =
      newStatus === "successful"
        ? "Xác nhận CHỐT KÈO THÀNH CÔNG? Bạn sẽ bắt đầu gửi hàng."
        : "Xác nhận HỦY KÈO? Hệ thống sẽ hoàn tiền cho mọi người.";

    if (!confirm(confirmMsg)) return;

    setIsActionLoading(true);
    try {
      // Gọi API Admin (Host cũng gọi được do đã sửa API)
      const res = await fetch(`/api/admin/group-buys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      alert("Cập nhật trạng thái thành công!");
      fetchGroupBuy();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- 2. THAM GIA ---
  const handleJoin = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    const qty = parseInt(joinQuantity);
    if (qty < 1) return alert("Số lượng tối thiểu là 1");

    const total = qty * Number(groupBuy.price_per_unit);
    if (!confirm(`Xác nhận tham gia? Trừ ${formatCurrency(total)} trong ví.`))
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

  // --- 3. GỬI / NHẬN HÀNG ---
  const handleParticipantAction = async (
    action: "ship" | "confirm",
    targetUserId?: string
  ) => {
    if (
      !confirm(
        action === "ship" ? "Xác nhận gửi hàng?" : "Xác nhận đã nhận hàng?"
      )
    )
      return;
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/group-buys/participant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          groupBuyId: id,
          targetUserId: targetUserId || user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      fetchGroupBuy();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- 4. BÁO CÁO HỦY KÈO ---
  const handleReport = async () => {
    const reason = prompt("Lý do bạn muốn yêu cầu hủy kèo này?");
    if (!reason) return;

    setIsActionLoading(true);
    try {
      const res = await fetch("/api/group-buys/participant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report",
          groupBuyId: id,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
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
  const isSuccessful = groupBuy.status === "successful";
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
                    : groupBuy.status === "successful"
                    ? "bg-green-600"
                    : groupBuy.status === "failed"
                    ? "bg-red-600"
                    : "bg-gray-600"
                }
              >
                {isOpen
                  ? "Đang Gom"
                  : groupBuy.status === "successful"
                  ? "Thành Công"
                  : groupBuy.status === "failed"
                  ? "Thất Bại"
                  : "Hoàn Tất"}
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
          {/* PANEL QUẢN LÝ CHO HOST */}
          {isHost && isOpen && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Settings className="h-5 w-5" /> Quản lý Kèo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-blue-700">
                  Bạn có thể chốt kèo sớm hoặc hủy.
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
                    <X className="mr-2 h-4 w-4" /> Hủy
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
              <div className="flex items-center gap-2 text-sm font-medium bg-white text-orange-800 px-3 py-2 rounded-md border border-orange-100 w-fit shadow-sm">
                <Users className="h-4 w-4" />{" "}
                <span>
                  Tiến độ: {groupBuy.currentQuantity} /{" "}
                  {groupBuy.target_quantity}
                </span>
              </div>

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

              {hasJoined && (
                <div className="bg-green-100 text-green-800 p-3 rounded-md text-center text-sm font-medium border border-green-200">
                  🎉 Bạn đã tham gia!
                </div>
              )}

              {hasJoined && (isOpen || isSuccessful) && !isHost && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleReport}
                  disabled={isActionLoading}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" /> Yêu cầu hủy kèo
                </Button>
              )}
            </CardContent>
          </Card>

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
                    className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p.user.avatar_url} />
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {p.user.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            SL: {p.quantity}
                          </p>
                        </div>
                      </div>
                      <div>
                        {p.status === "paid" && (
                          <Badge variant="secondary">Đã cọc</Badge>
                        )}
                        {p.status === "shipped" && (
                          <Badge className="bg-blue-600">Đã gửi</Badge>
                        )}
                        {p.status === "received" && (
                          <Badge className="bg-green-600">Đã nhận</Badge>
                        )}
                        {p.status === "refunded" && (
                          <Badge variant="destructive">Hoàn tiền</Badge>
                        )}
                      </div>
                    </div>

                    {isHost && isSuccessful && p.status === "paid" && (
                      <div className="flex gap-2 mt-2">
                        <div className="flex-1">
                          <OrderDetailsDialog
                            shippingAddress={p.user.shipping_info}
                            buyerName={p.user.username}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() =>
                            handleParticipantAction("ship", p.user.id)
                          }
                          disabled={isActionLoading}
                        >
                          <Truck className="mr-2 h-3 w-3" /> Xác nhận gửi
                        </Button>
                      </div>
                    )}

                    {user &&
                      user.id === p.user.id &&
                      p.status === "shipped" && (
                        <Button
                          size="sm"
                          className="w-full mt-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleParticipantAction("confirm")}
                          disabled={isActionLoading}
                        >
                          <PackageCheck className="mr-2 h-3 w-3" /> Đã nhận được
                          hàng
                        </Button>
                      )}
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
