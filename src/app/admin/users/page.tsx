// // src/app/admin/users/page.tsx
// "use client";

// import { useEffect, useState, useCallback } from "react"; // Thêm useCallback
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
// import { Loader2, AlertCircle } from "lucide-react";
// import { UserActions } from "@/components/admin/UserActions"; // Import component hành động

// // Định nghĩa kiểu User (khớp với API /api/admin/users trả về)
// interface User {
//   id: string;
//   username: string | null;
//   full_name: string | null;
//   email: string;
//   role: "user" | "dealer" | "admin";
//   is_verified: boolean;
//   status: "active" | "banned";
//   created_at: string;
// }

// export default function AdminUsersPage() {
//   const [users, setUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // === TÁCH HÀM FETCH RA NGOÀI ĐỂ GỌI LẠI ===
//   // Dùng useCallback để hàm này không bị tạo lại mỗi lần render
//   const fetchUsers = useCallback(async () => {
//     // Không set loading = true ở đây để tránh bảng bị "nháy" khi refresh
//     // setLoading(true);
//     setError(null);
//     console.log("AdminUsersPage: Đang fetch/refetch users..."); // Log
//     try {
//       const response = await fetch("/api/admin/users"); // Gọi API

//       if (!response.ok) {
//         const data = await response.json().catch(() => ({}));
//         if (response.status === 401 || response.status === 403) {
//           setError("Bạn không có quyền xem mục này.");
//         } else {
//           throw new Error(data.error || `Lỗi HTTP: ${response.status}`);
//         }
//       } else {
//         const data = await response.json();
//         setUsers(data.users || []); // Cập nhật danh sách mới
//       }
//     } catch (err: unknown) {
//       console.error("Lỗi fetch users:", err);
//       setError(err instanceof Error ? err.message : "Lỗi không xác định.");
//     } finally {
//       // Chỉ set loading false ở lần đầu tiên
//       if (loading) setLoading(false);
//     }
//   }, [loading]); // Phụ thuộc vào 'loading' để set nó về false
//   // =========================================

//   // useEffect ban đầu chỉ gọi fetchUsers 1 lần
//   useEffect(() => {
//     fetchUsers();
//   }, [fetchUsers]); // Chạy 1 lần khi mount (và khi fetchUsers thay đổi)

//   // --- Render UI ---
//   if (loading && users.length === 0) {
//     // Chỉ show loading xoay tròn lần đầu
//     return (
//       <div className="flex justify-center items-center py-20">
//         <Loader2 className="h-10 w-10 animate-spin text-primary" />
//         <p className="ml-3 text-muted-foreground">
//           Đang tải danh sách dân làng...
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

//   // Render bảng
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Quản lý Người dùng ({users.length})</CardTitle>
//         <CardDescription>
//           Xem, sửa, và ban/bỏ ban tài khoản người dùng trong hệ thống.
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         <Table>
//           <TableHeader>
//             <TableRow>
//               <TableHead>User</TableHead>
//               <TableHead>Email</TableHead>
//               <TableHead>Role</TableHead>
//               <TableHead>Verified</TableHead>
//               <TableHead>Trạng thái</TableHead>
//               <TableHead>Ngày tham gia</TableHead>
//               <TableHead className="text-right">Hành động</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {users.length === 0 ? (
//               <TableRow>
//                 <TableCell colSpan={7} className="text-center h-24">
//                   Chưa có "dân làng" nào đăng ký.
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
//                         user.role === "admin" ? "destructive" : "secondary"
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
//                       variant={user.status === "active" ? "default" : "outline"}
//                     >
//                       {user.status}
//                     </Badge>
//                   </TableCell>
//                   <TableCell>
//                     {new Date(user.created_at).toLocaleDateString("vi-VN")}
//                   </TableCell>
//                   <TableCell className="text-right">
//                     {/* === TRUYỀN "BỘ ĐÀM" VÀO ĐÂY === */}
//                     <UserActions
//                       user={{
//                         id: user.id,
//                         username: user.username,
//                         status: user.status,
//                         role: user.role,
//                         is_verified: user.is_verified,
//                       }}
//                       onActionSuccess={fetchUsers} // <-- Cái "bộ đàm" đây rồi!
//                     />
//                     {/* =============================== */}
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

// // src/app/admin/users/page.tsx
// "use client";

// import { useEffect, useState, useCallback, useMemo } from "react";
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
// import { useDebounce } from "@/hooks/useDebounce"; // Import "Bộ Trì Hoãn"

// // Định nghĩa kiểu User
// interface User {
//   id: string;
//   username: string | null;
//   full_name: string | null;
//   email: string;
//   role: "user" | "dealer" | "admin";
//   is_verified: boolean;
//   status: "active" | "banned";
//   created_at: string;
// }

// export default function AdminUsersPage() {
//   const [users, setUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(true); // Chỉ loading lần đầu
//   const [isSearching, setIsSearching] = useState(false); // State loading riêng cho search
//   const [error, setError] = useState<string | null>(null);

//   // State cho search
//   const [searchTerm, setSearchTerm] = useState("");
//   const debouncedSearchTerm = useDebounce(searchTerm, 300); // Trì hoãn 300ms

//   // === HÀM FETCH "DÂN SỐ" (ĐÃ SỬA LẠI) ===
//   const fetchUsers = useCallback(async (searchQuery: string) => {
//     // Nếu là đang search thì bật 'isSearching', nếu là lần đầu thì bật 'loading'
//     if (searchQuery) setIsSearching(true);
//     else setLoading(true);

//     setError(null);
//     console.log(`AdminUsersPage: Fetching users... Search: "${searchQuery}"`);

//     try {
//       const params = new URLSearchParams();
//       if (searchQuery) {
//         params.append("search", searchQuery); // Gửi search query
//       }

//       const response = await fetch(`/api/admin/users?${params.toString()}`); // Gọi API

//       if (!response.ok) {
//         const data = await response.json().catch(() => ({}));
//         let errorMsg = data.error || `Lỗi HTTP: ${response.status}`;
//         if (response.status === 401 || response.status === 403)
//           errorMsg = "Bạn không có quyền xem mục này.";
//         throw new Error(errorMsg);
//       }

//       const data = await response.json();
//       setUsers(data.users || []); // Cập nhật danh sách
//     } catch (err: unknown) {
//       console.error("Lỗi fetch users:", err);
//       setError(err instanceof Error ? err.message : "Lỗi không xác định.");
//     } finally {
//       // Tắt cả 2 loading
//       setLoading(false);
//       setIsSearching(false);
//     }
//   }, []); // Bỏ dependency đi, chỉ tạo hàm 1 lần
//   // =========================================

//   // useEffect ban đầu (Chỉ chạy 1 lần khi mount)
//   useEffect(() => {
//     fetchUsers(""); // Lần đầu tải, không search
//   }, [fetchUsers]); // fetchUsers giờ ổn định

//   // useEffect THỨ HAI: Theo dõi search (đã trì hoãn)
//   const [isInitialMount, setIsInitialMount] = useState(true); // Cờ check lần đầu
//   useEffect(() => {
//     if (isInitialMount) {
//       setIsInitialMount(false); // Bỏ qua lần chạy đầu tiên
//       return;
//     }

//     // Từ lần thứ 2, nếu debouncedSearchTerm thay đổi -> gọi API
//     fetchUsers(debouncedSearchTerm); // Gọi API với giá trị đã trì hoãn
//   }, [debouncedSearchTerm, fetchUsers, isInitialMount]); // Phụ thuộc

//   // --- Render UI ---
//   if (loading) {
//     // Chỉ show loading xoay tròn lần đầu (trang trắng)
//     return (
//       <div className="flex justify-center items-center py-20">
//         <Loader2 className="h-10 w-10 animate-spin text-primary" />
//         <p className="ml-3 text-muted-foreground">
//           Đang tải danh sách dân làng...
//         </p>
//       </div>
//     );
//   }

//   if (error) {
//     // Ưu tiên hiển thị lỗi
//     return (
//       <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
//         <AlertCircle className="h-8 w-8 text-destructive mr-3" />
//         <p className="text-destructive font-medium">
//           Toang! Không tải được: {error}
//         </p>
//       </div>
//     );
//   }

//   // Render bảng
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Quản lý Người dùng ({users.length})</CardTitle>
//         <CardDescription>
//           Xem, sửa, và ban/bỏ ban tài khoản người dùng trong hệ thống.
//         </CardDescription>

//         {/* === THANH SEARCH === */}
//         <div className="relative pt-4">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//           <Input
//             placeholder="Tìm theo email, username, hoặc tên..."
//             className="w-full max-w-sm pl-9"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
//         {/* ======================= */}
//       </CardHeader>

//       <CardContent>
//         {/* Hiển thị loading nhỏ khi đang search (đã có data cũ) */}
//         {isSearching && (
//           <div className="flex justify-center items-center py-4">
//             <Loader2 className="h-5 w-5 animate-spin text-primary" />
//             <span className="ml-2 text-muted-foreground text-sm">
//               Đang tìm...
//             </span>
//           </div>
//         )}

//         <Table>
//           <TableHeader>
//             <TableRow>
//               <TableHead>User</TableHead>
//               <TableHead>Email</TableHead>
//               <TableHead>Role</TableHead>
//               <TableHead>Verified</TableHead>
//               <TableHead>Trạng thái</TableHead>
//               <TableHead>Ngày tham gia</TableHead>
//               <TableHead className="text-right">Hành động</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {/* Nếu không loading VÀ length = 0 */}
//             {!isSearching && users.length === 0 ? (
//               <TableRow>
//                 <TableCell colSpan={7} className="text-center h-24">
//                   {searchTerm
//                     ? "Không tìm thấy user nào khớp."
//                     : "Chưa có user nào."}
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
//                         user.role === "admin" ? "destructive" : "secondary"
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
//                       variant={user.status === "active" ? "default" : "outline"}
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
//                       onActionSuccess={() => fetchUsers(debouncedSearchTerm)} // Gọi lại fetch với search term hiện tại
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

// src/app/admin/users/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Search } from "lucide-react";
import { UserActions } from "@/components/admin/UserActions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // <-- Thêm Button

// import { useDebounce } from '@/hooks/useDebounce'; // <-- BỎ

// Định nghĩa kiểu User
interface User {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: "user" | "dealer" | "admin";
  is_verified: boolean;
  status: "active" | "banned";
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false); // Đổi tên state
  const [error, setError] = useState<string | null>(null);

  // === BỎ DEBOUNCE ===
  const [searchTerm, setSearchTerm] = useState("");
  // const debouncedSearchTerm = useDebounce(searchTerm, 300); // BỎ
  // ====================

  // Hàm fetch "dân số" (đã nâng cấp search)
  const fetchUsers = useCallback(async (searchQuery: string) => {
    // Nếu là đang search thì bật 'isSearching', nếu là lần đầu thì bật 'loading'
    if (searchQuery) setIsSearching(true);
    else setLoading(true);

    setError(null);
    console.log(`AdminUsersPage: Fetching users... Search: "${searchQuery}"`);

    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append("search", searchQuery); // Gửi search query
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`); // Gọi API

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        let errorMsg = data.error || `Lỗi HTTP: ${response.status}`;
        if (response.status === 401 || response.status === 403)
          errorMsg = "Bạn không có quyền xem mục này.";
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setUsers(data.users || []); // Cập nhật danh sách
    } catch (err: unknown) {
      console.error("Lỗi fetch users:", err);
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      // Tắt cả 2 loading
      setLoading(false);
      setIsSearching(false);
    }
  }, []); // Bỏ dependency đi, chỉ tạo hàm 1 lần

  // useEffect ban đầu (Chỉ chạy 1 lần khi mount)
  useEffect(() => {
    fetchUsers(""); // Lần đầu tải, không search
  }, [fetchUsers]);

  // BỎ useEffect THỨ HAI (theo dõi debounce)

  // === HÀM MỚI: Xử lý khi bấm nút "Tìm" ===
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Chặn form reload
    // setIsSearching(true); // fetchUsers sẽ tự set
    fetchUsers(searchTerm); // Gọi API với searchTerm hiện tại
  };
  // ===================================

  // --- Render UI ---
  if (loading) {
    // Chỉ show loading xoay tròn lần đầu (trang trắng)
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">
          Đang tải danh sách dân làng...
        </p>
      </div>
    );
  }

  if (error) {
    // Ưu tiên hiển thị lỗi
    return (
      <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <AlertCircle className="h-8 w-8 text-destructive mr-3" />
        <p className="text-destructive font-medium">
          Toang! Không tải được: {error}
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quản lý Người dùng ({users.length})</CardTitle>
        <CardDescription>
          Xem, sửa, và ban/bỏ ban tài khoản người dùng trong hệ thống.
        </CardDescription>

        {/* === SỬA LẠI THANH SEARCH (DÙNG FORM) === */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative pt-4 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo email, username, hoặc tên..."
              className="w-full max-w-sm pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Tìm kiếm"
            )}
          </Button>
        </form>
        {/* ================================== */}
      </CardHeader>

      <CardContent>
        {/* Hiển thị loading nhỏ khi đang search (đã có data cũ) */}
        {isSearching && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground text-sm">
              Đang tìm...
            </span>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tham gia</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Nếu không loading VÀ length = 0 */}
            {!isSearching && users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  {searchTerm
                    ? "Không tìm thấy user nào khớp."
                    : "Chưa có user nào."}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div>{user.full_name || "Chưa đặt tên"}</div>
                    <div className="text-xs text-muted-foreground">
                      @{user.username || "..."}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">
                    <Badge
                      variant={
                        user.role === "admin" ? "destructive" : "secondary"
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.is_verified ? (
                      <Badge className="bg-green-600 hover:bg-green-700">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline">Chưa</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.status === "active" ? "default" : "outline"}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActions
                      user={{
                        id: user.id,
                        username: user.username,
                        status: user.status,
                        role: user.role,
                        is_verified: user.is_verified,
                      }}
                      onActionSuccess={() => fetchUsers(searchTerm)} // Gọi lại fetch với search term hiện tại
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
