// // src/app/admin/page.tsx
// "use client"; // <-- CHUYỂN SANG CLIENT COMPONENT

// import { useEffect, useState } from "react";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import {
//   Users,
//   Package,
//   Receipt,
//   CreditCard,
//   Loader2, // <-- Thêm
//   AlertCircle, // <-- Thêm
// } from "lucide-react";

// // Định nghĩa kiểu Stats
// interface DashboardStats {
//   userCount: number;
//   productCount: number;
//   transactionCount: number;
//   totalRevenue: number;
// }

// // Giả lập data (vẫn giữ lại cho bảng user mới)
// const exampleUsers = [
//   {
//     id: 1,
//     name: "Tuan (Admin)",
//     email: "tuan@example.com",
//     role: "admin",
//     status: "Active",
//   },
//   {
//     id: 2,
//     name: "Hien (User)",
//     email: "hien@example.com",
//     role: "user",
//     status: "Active",
//   },
//   {
//     id: 3,
//     name: "Larry2239",
//     email: "larry@example.com",
//     role: "user",
//     status: "Pending",
//   },
// ];

// // Hàm format tiền
// const formatCurrency = (amount: number) => {
//   return new Intl.NumberFormat("vi-VN", {
//     style: "currency",
//     currency: "VND",
//   }).format(amount);
// };

// export default function AdminHomePage() {
//   const [stats, setStats] = useState<DashboardStats | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // --- Fetch data thật ---
//   useEffect(() => {
//     const fetchStats = async () => {
//       try {
//         setLoading(true);
//         setError(null);
//         const res = await fetch("/api/admin/stats");
//         if (!res.ok) {
//           const data = await res.json().catch(() => ({}));
//           throw new Error(data.error || "Không thể tải số liệu");
//         }
//         const data = await res.json();
//         setStats(data.stats);
//       } catch (err: unknown) {
//         setError(err instanceof Error ? err.message : "Lỗi không xác định.");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchStats();
//   }, []); // Chạy 1 lần khi mount

//   // --- Render UI ---
//   return (
//     <div className="space-y-6">
//       <h1 className="text-3xl font-bold">Dashboard</h1>

//       {/* 1. Card Tóm tắt (Sẽ hiển thị loading hoặc data thật) */}
//       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//         {/* Card Tổng Users */}
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Tổng Users</CardTitle>
//             <Users className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             {loading ? (
//               <Loader2 className="h-6 w-6 animate-spin" />
//             ) : (
//               <div className="text-2xl font-bold">{stats?.userCount}</div>
//             )}
//             <p className="text-xs text-muted-foreground">
//               Tổng số người dùng đã đăng ký
//             </p>
//           </CardContent>
//         </Card>

//         {/* Card Sản phẩm đang bán */}
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">
//               Sản phẩm đang bán
//             </CardTitle>
//             <Package className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             {loading ? (
//               <Loader2 className="h-6 w-6 animate-spin" />
//             ) : (
//               <div className="text-2xl font-bold">{stats?.productCount}</div>
//             )}
//             <p className="text-xs text-muted-foreground">
//               Các sản phẩm có status 'available'
//             </p>
//           </CardContent>
//         </Card>

//         {/* Card Giao dịch */}
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">
//               Giao dịch thành công
//             </CardTitle>
//             <Receipt className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             {loading ? (
//               <Loader2 className="h-6 w-6 animate-spin" />
//             ) : (
//               <div className="text-2xl font-bold">
//                 {stats?.transactionCount}
//               </div>
//             )}
//             <p className="text-xs text-muted-foreground">
//               Tổng số giao dịch 'completed'
//             </p>
//           </CardContent>
//         </Card>

//         {/* Card Doanh thu */}
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">
//               Tổng Doanh thu (Hoa hồng)
//             </CardTitle>
//             <CreditCard className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             {loading ? (
//               <Loader2 className="h-6 w-6 animate-spin" />
//             ) : (
//               <div className="text-2xl font-bold">
//                 {formatCurrency(stats?.totalRevenue ?? 0)}
//               </div>
//             )}
//             <p className="text-xs text-muted-foreground">
//               Tổng hoa hồng (platform_commission)
//             </p>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Hiển thị lỗi nếu có */}
//       {error && (
//         <div className="flex items-center justify-center p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
//           <AlertCircle className="h-5 w-5 text-destructive mr-3" />
//           <p className="text-destructive font-medium">
//             Lỗi tải Dashboard: {error}
//           </p>
//         </div>
//       )}

//       {/* 2. Bảng dữ liệu (Giữ nguyên data giả lập) */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Người dùng mới</CardTitle>
//           <CardDescription>
//             (Demo) Danh sách những người dùng đăng ký gần đây.
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Tên</TableHead>
//                 <TableHead>Email</TableHead>
//                 <TableHead>Role</TableHead>
//                 <TableHead>Trạng thái</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {exampleUsers.map((user) => (
//                 <TableRow key={user.id}>
//                   <TableCell className="font-medium">{user.name}</TableCell>
//                   <TableCell>{user.email}</TableCell>
//                   <TableCell>
//                     <Badge
//                       variant={
//                         user.role === "admin" ? "destructive" : "secondary"
//                       }
//                     >
//                       {user.role}
//                     </Badge>
//                   </TableCell>
//                   <TableCell>
//                     <Badge
//                       variant={user.status === "Active" ? "default" : "outline"}
//                     >
//                       {user.status}
//                     </Badge>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// // src/app/admin/users/page.tsx
// "use client";

// import { useEffect, useState, useCallback } from "react";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import { Loader2, AlertCircle, Search } from "lucide-react";
// import { UserActions } from "@/components/admin/UserActions";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// // === 1. IMPORT TỪ PRISMA ===
// import { User, UserRole, UserStatus } from "@prisma/client";
// // ========================

// // === 2. ĐỊNH NGHĨA USER ROW CHO API ===
// // Dùng Pick để chọn những trường API trả về + xử lý created_at string
// type UserRow = Pick<
//   User,
//   "id" | "username" | "full_name" | "email" | "role" | "is_verified" | "status"
// > & {
//   created_at: string;
// };

// export default function AdminUsersPage() {
//   // === 3. SỬ DỤNG TYPE MỚI ===
//   const [users, setUsers] = useState<UserRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [isSearching, setIsSearching] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");

//   const fetchUsers = useCallback(
//     async (searchQuery: string, isInitialLoad: boolean = false) => {
//       if (isInitialLoad) {
//         setLoading(true);
//       } else {
//         setIsSearching(true);
//       }
//       setError(null);

//       try {
//         const params = new URLSearchParams();
//         if (searchQuery) {
//           params.append("search", searchQuery);
//         }

//         const response = await fetch(`/api/admin/users?${params.toString()}`);
//         if (!response.ok) {
//           const data = await response.json().catch(() => ({}));
//           throw new Error(data.error || `Lỗi HTTP: ${response.status}`);
//         }
//         const data = await response.json();
//         setUsers(data.users || []);
//       } catch (err: unknown) {
//         setError(err instanceof Error ? err.message : "Lỗi không xác định.");
//       } finally {
//         setLoading(false);
//         setIsSearching(false);
//       }
//     },
//     []
//   );

//   useEffect(() => {
//     fetchUsers("", true);
//   }, [fetchUsers]);

//   const handleSearchSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     fetchUsers(searchTerm, false);
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center py-20">
//         <Loader2 className="h-10 w-10 animate-spin text-primary" />
//         <p className="ml-3 text-muted-foreground">
//           Đang tải danh sách người dùng...
//         </p>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
//         <AlertCircle className="h-8 w-8 text-destructive mr-3" />
//         <p className="text-destructive font-medium">
//           Toang! Không tải được: {error}
//         </p>
//       </div>
//     );
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Quản lý Người dùng ({users.length})</CardTitle>
//         <CardDescription>
//           Xem, sửa, và ban/bỏ ban tài khoản người dùng trong hệ thống.
//         </CardDescription>
//         <form
//           onSubmit={handleSearchSubmit}
//           className="relative pt-4 flex gap-2"
//         >
//           <div className="relative flex-1">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//             <Input
//               placeholder="Tìm theo email, username, hoặc tên..."
//               className="w-full max-w-sm pl-9"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>
//           <Button type="submit" disabled={isSearching}>
//             {isSearching ? (
//               <Loader2 className="h-4 w-4 animate-spin" />
//             ) : (
//               "Tìm kiếm"
//             )}
//           </Button>
//         </form>
//       </CardHeader>

//       <CardContent>
//         {isSearching && (
//           <div className="flex justify-center items-center py-4">
//             <Loader2 className="h-5 w-5 animate-spin text-primary" />
//             <span className="ml-2 text-muted-foreground text-sm">
//               Đang tải...
//             </span>
//           </div>
//         )}

//         <Table>
//           <TableHeader>
//             <TableRow>
//               <TableHead>User</TableHead>
//               <TableHead>Email</TableHead>
//               <TableHead>Role</TableHead>
//               <TableHead>Verify</TableHead>
//               <TableHead>Status</TableHead>
//               <TableHead>Ngày tham gia</TableHead>
//               <TableHead className="text-right">Hành động</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {!isSearching && users.length === 0 ? (
//               <TableRow>
//                 <TableCell colSpan={7} className="text-center h-24">
//                   Không tìm thấy người dùng nào.
//                 </TableCell>
//               </TableRow>
//             ) : (
//               users.map((user) => (
//                 <TableRow key={user.id}>
//                   <TableCell className="font-medium">
//                     <div>{user.full_name || "Chưa đặt tên"}</div>
//                     <div className="text-xs text-muted-foreground">
//                       @{user.username || "..."}
//                     </div>
//                   </TableCell>
//                   <TableCell>{user.email}</TableCell>
//                   <TableCell className="capitalize">
//                     <Badge
//                       variant={
//                         user.role === UserRole.admin // Dùng Enum
//                           ? "destructive"
//                           : "secondary"
//                       }
//                     >
//                       {user.role}
//                     </Badge>
//                   </TableCell>
//                   <TableCell>
//                     {user.is_verified ? (
//                       <Badge className="bg-green-600 hover:bg-green-700">
//                         Verified
//                       </Badge>
//                     ) : (
//                       <Badge variant="outline">Chưa</Badge>
//                     )}
//                   </TableCell>
//                   <TableCell>
//                     <Badge
//                       variant={
//                         user.status === UserStatus.active // Dùng Enum
//                           ? "default"
//                           : "outline"
//                       }
//                     >
//                       {user.status}
//                     </Badge>
//                   </TableCell>
//                   <TableCell>
//                     {new Date(user.created_at).toLocaleDateString("vi-VN")}
//                   </TableCell>
//                   <TableCell className="text-right">
//                     <UserActions
//                       user={{
//                         id: user.id,
//                         username: user.username,
//                         status: user.status,
//                         role: user.role,
//                         is_verified: user.is_verified,
//                       }}
//                       onActionSuccess={() => fetchUsers(searchTerm, false)}
//                     />
//                   </TableCell>
//                 </TableRow>
//               ))
//             )}
//           </TableBody>
//         </Table>
//       </CardContent>
//     </Card>
//   );
// }

// src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Package,
  Receipt,
  CreditCard,
  Loader2,
  AlertCircle,
  Gavel,
} from "lucide-react";

// Định nghĩa kiểu Stats
interface DashboardStats {
  userCount: number;
  productCount: number;
  transactionCount: number;
  totalRevenue: number;
  auctionCount: number;
}

// Hàm format tiền
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export default function AdminHomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Không thể tải số liệu");
        const data = await res.json();
        setStats(data.stats);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard Tổng quan</h1>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" /> {error}
        </div>
      )}

      {/* Grid Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng Người dùng
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats?.userCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Tài khoản đã đăng ký
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sản phẩm Sẵn sàng
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats?.productCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Đang hiển thị trên sàn
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Đơn thành công
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.transactionCount}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Giao dịch completed</p>
          </CardContent>
        </Card>

        {/* Card 4: Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu Sàn</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.totalRevenue ?? 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Tổng hoa hồng thu được
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Auctions (Mới thêm) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Đấu giá Đang chạy
            </CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats?.auctionCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Phiên status 'active'
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
