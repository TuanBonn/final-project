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
  ExternalLink,
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
      if (!res.ok) throw new Error("Failed to load data");
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

  const handleHostStatusChange = async (newStatus: "successful" | "failed") => {
    const confirmMsg =
      newStatus === "successful"
        ? "Confirm CLOSE this group buy as SUCCESSFUL?\n\nThe system will automatically create orders for all participants in the 'Order Management' section."
        : "Confirm CANCEL this group buy?\n\nThe system will refund 100% to all participants.";

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

      alert("Success! Orders have been created.");
      fetchGroupBuy();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    const qty = parseInt(joinQuantity);
    if (qty < 1) return alert("Minimum quantity is 1");

    const total = qty * Number(groupBuy.price_per_unit);
    if (
      !confirm(
        `Confirm to join? Your wallet will be charged ${formatCurrency(total)}.`
      )
    )
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
        if (res.status === 402 && confirm("Insufficient balance. Top up now?"))
          router.push("/wallet");
        else alert(data.error);
        return;
      }
      alert("Joined successfully!");
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
    return <div className="text-center py-20">Group buy does not exist.</div>;

  const isOpen = groupBuy.status === "open";
  const isSuccessful = groupBuy.status === "successful";
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
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN */}
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
                  ? "Open"
                  : isSuccessful
                  ? "Closed & Orders Created"
                  : "Cancelled"}
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
                <CardTitle className="text-lg">Group buy details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">
                  {groupBuy.product_description}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* HOST MANAGEMENT PANEL */}
          {isHost && isOpen && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Settings className="h-5 w-5" /> Manage Group Buy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-blue-700">
                  Reached the target quantity? Close now to let the system{" "}
                  <strong>automatically create orders</strong> for all
                  participants.
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleHostStatusChange("successful")}
                    disabled={isActionLoading}
                  >
                    <Check className="mr-2 h-4 w-4" /> Close Group Buy
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleHostStatusChange("failed")}
                    disabled={isActionLoading}
                  >
                    <X className="mr-2 h-4 w-4" /> Cancel Group Buy
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-orange-200 bg-orange-50/30 shadow-lg">
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Group buy price
                </p>
                <p className="text-4xl font-bold text-orange-600">
                  {formatCurrency(Number(groupBuy.price_per_unit))}
                </p>
              </div>

              {/* NOTICE WHEN SUCCESSFUL */}
              {isSuccessful && (
                <div className="bg-green-100 border border-green-300 text-green-800 p-4 rounded-md">
                  <p className="font-bold flex items-center gap-2">
                    <Check className="h-5 w-5" /> Group buy has been closed!
                  </p>
                  <p className="text-sm mt-1">
                    Orders have been created. Please check the{" "}
                    <strong>Orders</strong> page to track the shipment.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full border-green-600 text-green-700 hover:bg-green-200"
                    asChild
                  >
                    <Link href="/orders">
                      <ExternalLink className="mr-2 h-4 w-4" /> Go to Orders
                    </Link>
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm font-medium bg-white text-orange-800 px-3 py-2 rounded-md border border-orange-100 w-fit shadow-sm">
                <Users className="h-4 w-4" />
                <span>
                  Joined: {groupBuy.currentQuantity} /{" "}
                  {groupBuy.target_quantity}
                </span>
              </div>

              {/* JOIN BUTTON */}
              {isOpen && !isHost && !hasJoined && (
                <div className="space-y-3 pt-4 border-t border-orange-200 mt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium whitespace-nowrap">
                      Quantity:
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
                    Join & Pay Deposit
                  </Button>
                </div>
              )}

              {hasJoined && isOpen && (
                <div className="bg-blue-100 text-blue-800 p-3 rounded-md text-center text-sm font-medium border border-blue-200">
                  You have already joined this group buy. Please wait for the
                  host to close it.
                </div>
              )}
            </CardContent>
          </Card>

          {/* PARTICIPANTS LIST */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                {groupBuy.participants.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm">
                    No participants yet.
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
                          Qty: {p.quantity}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Deposited</Badge>
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
