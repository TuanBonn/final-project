// src/app/admin/page.tsx
// Trang chủ của Admin (Dashboard Tổng quan)

// Component này tự động là Server Component,
// nhưng "bảo vệ" ở layout.tsx đã check quyền admin rồi

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
import { Users, Package, Receipt, CreditCard } from "lucide-react"; // Đảm bảo đã npm install lucide-react

// Giả lập data (sau này sếp sẽ fetch từ API)
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

// Hàm này (mặc định) là Server Component
export default async function AdminHomePage() {
  // (Trong tương lai, sếp có thể fetch data thật ở đây)
  // const { data: userCount } = await supabaseAdmin.from('users').select('*', { count: 'exact' });
  // const { data: productCount } = await supabaseAdmin.from('products').select('*', { count: 'exact' });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* 1. Card Tóm tắt (Giống ảnh) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+50 tuần này</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sản phẩm đang bán
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+520</div>
            <p className="text-xs text-muted-foreground">+10 hôm nay</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Giao dịch (Tháng này)
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">150</div>
            <p className="text-xs text-muted-foreground">
              +15 so với tháng trước
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Doanh thu (Tháng này)
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25,000,000 ₫</div>
            <p className="text-xs text-muted-foreground">Hoa hồng thu được</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Bảng dữ liệu (Ví dụ) */}
      <Card>
        <CardHeader>
          <CardTitle>Người dùng mới</CardTitle>
          <CardDescription>
            Danh sách những người dùng đăng ký gần đây.
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
