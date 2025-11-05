// src/app/admin/page.tsx
"use client"; // <-- CHUYỂN SANG CLIENT COMPONENT

import { useEffect, useState } from "react";
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
import {
  Users,
  Package,
  Receipt,
  CreditCard,
  Loader2, // <-- Thêm
  AlertCircle, // <-- Thêm
} from "lucide-react";

// Định nghĩa kiểu Stats
interface DashboardStats {
  userCount: number;
  productCount: number;
  transactionCount: number;
  totalRevenue: number;
}

// Giả lập data (vẫn giữ lại cho bảng user mới)
const exampleUsers = [
  {
    id: 1,
    name: "Tuan (Admin)",
    email: "tuan@example.com",
    role: "admin",
    status: "Active",
  },
  {
    id: 2,
    name: "Hien (User)",
    email: "hien@example.com",
    role: "user",
    status: "Active",
  },
  {
    id: 3,
    name: "Larry2239",
    email: "larry@example.com",
    role: "user",
    status: "Pending",
  },
];

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

  // --- Fetch data thật ---
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/stats");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Không thể tải số liệu");
        }
        const data = await res.json();
        setStats(data.stats);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []); // Chạy 1 lần khi mount

  // --- Render UI ---
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* 1. Card Tóm tắt (Sẽ hiển thị loading hoặc data thật) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card Tổng Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats?.userCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Tổng số người dùng đã đăng ký
            </p>
          </CardContent>
        </Card>

        {/* Card Sản phẩm đang bán */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sản phẩm đang bán
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
              Các sản phẩm có status 'available'
            </p>
          </CardContent>
        </Card>

        {/* Card Giao dịch */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Giao dịch thành công
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
            <p className="text-xs text-muted-foreground">
              Tổng số giao dịch 'completed'
            </p>
          </CardContent>
        </Card>

        {/* Card Doanh thu */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng Doanh thu (Hoa hồng)
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.totalRevenue ?? 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Tổng hoa hồng (platform_commission)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hiển thị lỗi nếu có */}
      {error && (
        <div className="flex items-center justify-center p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive mr-3" />
          <p className="text-destructive font-medium">
            Lỗi tải Dashboard: {error}
          </p>
        </div>
      )}

      {/* 2. Bảng dữ liệu (Giữ nguyên data giả lập) */}
      <Card>
        <CardHeader>
          <CardTitle>Người dùng mới</CardTitle>
          <CardDescription>
            (Demo) Danh sách những người dùng đăng ký gần đây.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exampleUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === "admin" ? "destructive" : "secondary"
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.status === "Active" ? "default" : "outline"}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
