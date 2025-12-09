// "use client";

// import { useEffect, useState, useCallback } from "react";
// import { useParams, useRouter } from "next/navigation";
// import Link from "next/link";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import {
//   Loader2,
//   Users,
//   ArrowLeft,
//   ShieldCheck,
//   ShoppingBag,
//   Check,
//   X,
//   Settings,
//   ExternalLink,
// } from "lucide-react";
// import { ProductImageGallery } from "@/components/ProductImageGallery";
// import { useUser } from "@/contexts/UserContext";

// const formatCurrency = (amount: number) =>
//   new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
//     amount
//   );

// export default function GroupBuyDetailPage() {
//   const { id } = useParams();
//   const { user } = useUser();
//   const router = useRouter();

//   const [groupBuy, setGroupBuy] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [joinQuantity, setJoinQuantity] = useState("1");
//   const [isActionLoading, setIsActionLoading] = useState(false);

//   const fetchGroupBuy = useCallback(async () => {
//     try {
//       const res = await fetch(`/api/group-buys/${id}`);
//       if (!res.ok) throw new Error("Failed to load data");
//       const data = await res.json();
//       setGroupBuy(data.groupBuy);
//     } catch (error) {
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   }, [id]);

//   useEffect(() => {
//     fetchGroupBuy();
//   }, [fetchGroupBuy]);

//   const handleHostStatusChange = async (newStatus: "successful" | "failed") => {
//     // ... (Logic giữ nguyên)
//     const confirmMsg =
//       newStatus === "successful"
//         ? "Confirm CLOSE this group buy as SUCCESSFUL?\n\nThe system will automatically create orders for all participants in the 'Order Management' section."
//         : "Confirm CANCEL this group buy?\n\nThe system will refund 100% to all participants.";

//     if (!confirm(confirmMsg)) return;

//     setIsActionLoading(true);
//     try {
//       const res = await fetch(`/api/admin/group-buys/${id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ status: newStatus }),
//       });

//       if (!res.ok) {
//         const data = await res.json();
//         throw new Error(data.error);
//       }

//       alert("Success! Orders have been created.");
//       fetchGroupBuy();
//     } catch (e: any) {
//       alert(e.message);
//     } finally {
//       setIsActionLoading(false);
//     }
//   };

//   const handleJoin = async () => {
//     // ... (Logic giữ nguyên)
//     if (!user) {
//       router.push("/login");
//       return;
//     }
//     const qty = parseInt(joinQuantity);
//     if (qty < 1) return alert("Minimum quantity is 1");

//     const total = qty * Number(groupBuy.price_per_unit);
//     if (
//       !confirm(
//         `Confirm to join? Your wallet will be charged ${formatCurrency(total)}.`
//       )
//     )
//       return;

//     setIsActionLoading(true);
//     try {
//       const res = await fetch(`/api/group-buys/${id}/join`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ quantity: qty }),
//       });
//       const data = await res.json();
//       if (!res.ok) {
//         if (res.status === 402 && confirm("Insufficient balance. Top up now?"))
//           router.push("/wallet");
//         else alert(data.error);
//         return;
//       }
//       alert("Joined successfully!");
//       fetchGroupBuy();
//     } catch (error: any) {
//       alert(error.message);
//     } finally {
//       setIsActionLoading(false);
//     }
//   };

//   if (loading)
//     return (
//       <div className="flex justify-center py-20">
//         <Loader2 className="animate-spin h-10 w-10" />
//       </div>
//     );
//   if (!groupBuy)
//     return <div className="text-center py-20">Group buy does not exist.</div>;

//   const isOpen = groupBuy.status === "open";
//   const isSuccessful = groupBuy.status === "successful";
//   const isHost = user && groupBuy.host.id === user.id;
//   const myParticipation = user
//     ? groupBuy.participants.find((p: any) => p.user.id === user.id)
//     : null;
//   const hasJoined = !!myParticipation;

//   return (
//     <div className="container mx-auto py-6 max-w-5xl px-4">
//       <Button variant="ghost" asChild className="mb-4">
//         <Link href="/group-buys">
//           <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
//         </Link>
//       </Button>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         <div className="lg:col-span-2 space-y-6">
//           <ProductImageGallery
//             images={groupBuy.product_images}
//             productName={groupBuy.product_name}
//           />

//           <div>
//             <div className="flex justify-between items-start">
//               <h1 className="text-3xl font-bold mb-2">
//                 {groupBuy.product_name}
//               </h1>
//               <Badge
//                 className={
//                   isOpen
//                     ? "bg-blue-600"
//                     : isSuccessful
//                     ? "bg-green-600"
//                     : "bg-red-600"
//                 }
//               >
//                 {isOpen
//                   ? "Open"
//                   : isSuccessful
//                   ? "Closed & Orders Created"
//                   : "Cancelled"}
//               </Badge>
//             </div>

//             {/* [CẬP NHẬT] Host Info Link */}
//             <div className="flex items-center gap-2 text-muted-foreground mb-4">
//               <Link href={`/user/${groupBuy.host.username}`}>
//                 <Avatar className="h-6 w-6 cursor-pointer hover:opacity-80">
//                   <AvatarImage src={groupBuy.host.avatar_url} />
//                   <AvatarFallback>H</AvatarFallback>
//                 </Avatar>
//               </Link>
//               <span className="text-sm">
//                 Host:
//                 <Link
//                   href={`/user/${groupBuy.host.username}`}
//                   className="ml-1 font-bold hover:underline hover:text-primary"
//                 >
//                   {groupBuy.host.username}
//                 </Link>
//               </span>
//             </div>

//             <Card>
//               <CardHeader>
//                 <CardTitle className="text-lg">Group buy details</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p className="text-muted-foreground whitespace-pre-line">
//                   {groupBuy.product_description}
//                 </p>
//               </CardContent>
//             </Card>
//           </div>
//         </div>

//         <div className="space-y-6">
//           {/* HOST PANEL */}
//           {isHost && isOpen && (
//             <Card className="border-2 border-blue-200 bg-blue-50">
//               <CardHeader className="pb-2">
//                 <CardTitle className="text-blue-800 flex items-center gap-2">
//                   <Settings className="h-5 w-5" /> Manage Group Buy
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-3">
//                 <p className="text-sm text-blue-700">
//                   Reached the target quantity? Close now to let the system{" "}
//                   <strong>automatically create orders</strong> for all
//                   participants.
//                 </p>
//                 <div className="flex gap-2">
//                   <Button
//                     className="flex-1 bg-green-600 hover:bg-green-700"
//                     onClick={() => handleHostStatusChange("successful")}
//                     disabled={isActionLoading}
//                   >
//                     <Check className="mr-2 h-4 w-4" /> Close Group Buy
//                   </Button>
//                   <Button
//                     variant="destructive"
//                     className="flex-1"
//                     onClick={() => handleHostStatusChange("failed")}
//                     disabled={isActionLoading}
//                   >
//                     <X className="mr-2 h-4 w-4" /> Cancel Group Buy
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>
//           )}

//           <Card className="border-orange-200 bg-orange-50/30 shadow-lg">
//             <CardContent className="p-6 space-y-6">
//               {/* ... (Phần Price & Join button giữ nguyên) ... */}
//               <div>
//                 <p className="text-sm text-muted-foreground mb-1">
//                   Group buy price
//                 </p>
//                 <p className="text-4xl font-bold text-orange-600">
//                   {formatCurrency(Number(groupBuy.price_per_unit))}
//                 </p>
//               </div>

//               {isSuccessful && (
//                 <div className="bg-green-100 border border-green-300 text-green-800 p-4 rounded-md">
//                   <p className="font-bold flex items-center gap-2">
//                     <Check className="h-5 w-5" /> Group buy has been closed!
//                   </p>
//                   <p className="text-sm mt-1">
//                     Orders have been created. Please check the{" "}
//                     <strong>Orders</strong> page.
//                   </p>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="mt-3 w-full border-green-600 text-green-700 hover:bg-green-200"
//                     asChild
//                   >
//                     <Link href="/orders">
//                       <ExternalLink className="mr-2 h-4 w-4" /> Go to Orders
//                     </Link>
//                   </Button>
//                 </div>
//               )}

//               <div className="flex items-center gap-2 text-sm font-medium bg-white text-orange-800 px-3 py-2 rounded-md border border-orange-100 w-fit shadow-sm">
//                 <Users className="h-4 w-4" />
//                 <span>
//                   Joined: {groupBuy.currentQuantity} /{" "}
//                   {groupBuy.target_quantity}
//                 </span>
//               </div>

//               {isOpen && !isHost && !hasJoined && (
//                 <div className="space-y-3 pt-4 border-t border-orange-200 mt-2">
//                   <div className="flex items-center gap-3">
//                     <span className="text-sm font-medium whitespace-nowrap">
//                       Quantity:
//                     </span>
//                     <Input
//                       type="number"
//                       min="1"
//                       value={joinQuantity}
//                       onChange={(e) => setJoinQuantity(e.target.value)}
//                       className="bg-white"
//                     />
//                   </div>
//                   <Button
//                     onClick={handleJoin}
//                     className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6"
//                     disabled={isActionLoading}
//                   >
//                     {isActionLoading ? (
//                       <Loader2 className="animate-spin mr-2" />
//                     ) : (
//                       <ShoppingBag className="mr-2 h-5 w-5" />
//                     )}{" "}
//                     Join & Pay Deposit
//                   </Button>
//                 </div>
//               )}

//               {hasJoined && isOpen && (
//                 <div className="bg-blue-100 text-blue-800 p-3 rounded-md text-center text-sm font-medium border border-blue-200">
//                   You have already joined this group buy.
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           {/* PARTICIPANTS LIST */}
//           <Card>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-lg">Participants</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
//                 {groupBuy.participants.length === 0 && (
//                   <p className="text-center text-muted-foreground text-sm">
//                     No participants yet.
//                   </p>
//                 )}
//                 {groupBuy.participants.map((p: any, idx: number) => (
//                   <div
//                     key={idx}
//                     className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
//                   >
//                     <div className="flex items-center gap-2">
//                       <Link href={`/user/${p.user.username}`}>
//                         <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80">
//                           <AvatarImage src={p.user.avatar_url} />
//                           <AvatarFallback>U</AvatarFallback>
//                         </Avatar>
//                       </Link>
//                       <div>
//                         <Link
//                           href={`/user/${p.user.username}`}
//                           className="text-sm font-medium hover:underline hover:text-primary"
//                         >
//                           {p.user.username}
//                         </Link>
//                         <p className="text-xs text-muted-foreground">
//                           Qty: {p.quantity}
//                         </p>
//                       </div>
//                     </div>
//                     <Badge variant="secondary">Deposited</Badge>
//                   </div>
//                 ))}
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }

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
  ShoppingBag,
  Check,
  X,
  Settings,
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
      // Thêm timestamp để tránh cache
      const res = await fetch(`/api/group-buys/${id}?t=${Date.now()}`);
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

  // --- HOST CLOSE / CANCEL GROUP BUY ---
  const handleHostStatusChange = async (newStatus: "successful" | "failed") => {
    // === LOGIC MỚI: Check realtime trước khi hủy nếu đang hiển thị là 0 người ===
    if (newStatus === "failed" && groupBuy.participants.length === 0) {
      setIsActionLoading(true);
      try {
        // Fetch lại dữ liệu mới nhất
        const res = await fetch(`/api/group-buys/${id}?t=${Date.now()}`);
        const data = await res.json();
        const latestParticipants = data.groupBuy?.participants || [];

        // Nếu phát hiện có người tham gia mới
        if (latestParticipants.length > 0) {
          alert(
            "Cảnh báo: Đã có thành viên vừa tham gia phiên này!\nTrang sẽ được tải lại để cập nhật danh sách."
          );
          setGroupBuy(data.groupBuy); // Cập nhật state
          setIsActionLoading(false);
          return; // Dừng hành động hủy
        }
      } catch (e) {
        console.error("Check failed", e);
      }
    }

    const confirmMsg =
      newStatus === "successful"
        ? "Xác nhận CHỐT KÈO thành công?\n\nHệ thống sẽ tự động tạo đơn hàng cho tất cả người tham gia."
        : "Xác nhận HỦY KÈO này?\n\nHệ thống sẽ hoàn tiền 100% cho người tham gia (nếu có).";

    if (!confirm(confirmMsg)) {
      setIsActionLoading(false);
      return;
    }

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

      alert("Thao tác thành công!");
      fetchGroupBuy();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- USER JOIN ---
  const handleJoin = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    const qty = parseInt(joinQuantity);
    if (qty < 1) return alert("Số lượng tối thiểu là 1");

    const total = qty * Number(groupBuy.price_per_unit);
    if (
      !confirm(
        `Xác nhận tham gia? Ví của bạn sẽ bị trừ ${formatCurrency(total)}.`
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
        if (res.status === 402 && confirm("Số dư không đủ. Nạp tiền ngay?"))
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
    return <div className="text-center py-20">Group buy does not exist.</div>;

  const isOpen = groupBuy.status === "open";
  // [SỬA LOGIC BADGE]: Cả successful và completed đều tính là thành công
  const isSuccessful =
    groupBuy.status === "successful" || groupBuy.status === "completed";
  const isFailed = groupBuy.status === "failed";

  const isHost = user && groupBuy.host.id === user.id;
  const myParticipation = user
    ? groupBuy.participants.find((p: any) => p.user.id === user.id)
    : null;
  const hasJoined = !!myParticipation;
  const hasParticipants = groupBuy.participants.length > 0;

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
                  ? "Successful / Completed"
                  : "Cancelled"}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Link href={`/user/${groupBuy.host.username}`}>
                <Avatar className="h-6 w-6 cursor-pointer hover:opacity-80">
                  <AvatarImage src={groupBuy.host.avatar_url} />
                  <AvatarFallback>H</AvatarFallback>
                </Avatar>
              </Link>
              <span className="text-sm">
                Host:
                <Link
                  href={`/user/${groupBuy.host.username}`}
                  className="ml-1 font-bold hover:underline hover:text-primary"
                >
                  {groupBuy.host.username}
                </Link>
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
                  {hasParticipants
                    ? "Đã có người tham gia. Bạn có thể chốt kèo hoặc hủy."
                    : "Chưa có người tham gia. Bạn có thể hủy kèo này."}
                </p>
                <div className="flex gap-2 flex-col sm:flex-row">
                  {/* [LOGIC MỚI] Chỉ hiện nút Chốt Kèo nếu có người tham gia */}
                  {hasParticipants && (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleHostStatusChange("successful")}
                      disabled={isActionLoading}
                    >
                      <Check className="mr-2 h-4 w-4" /> Close Group Buy
                    </Button>
                  )}

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
                    <Check className="h-5 w-5" /> Kèo đã chốt thành công!
                  </p>
                  <p className="text-sm mt-1">
                    Đơn hàng đã được tạo. Vui lòng kiểm tra trang{" "}
                    <strong>Đơn hàng</strong> để theo dõi vận chuyển.
                    <br />
                    <em>(Phiên sẽ tự động ẩn khi tất cả giao dịch hoàn tất)</em>
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
                  Bạn đã tham gia kèo này. Vui lòng chờ Host chốt.
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
                      <Link href={`/user/${p.user.username}`}>
                        <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80">
                          <AvatarImage src={p.user.avatar_url} />
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div>
                        <Link
                          href={`/user/${p.user.username}`}
                          className="text-sm font-medium hover:underline hover:text-primary"
                        >
                          {p.user.username}
                        </Link>
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
