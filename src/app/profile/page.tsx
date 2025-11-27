// src/app/profile/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ShieldCheck,
  MapPin,
  CreditCard,
  Save,
  User,
  Camera,
  UploadCloud,
  KeyRound,
  Package,
  HelpCircle,
  Gem,
  Search, // <-- Thêm Icon Search
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Separator } from "@/components/ui/separator";
import { uploadFileViaApi } from "@/lib/storageUtils";
import { ProductCard } from "@/components/ProductCard";
import { UpgradeAccount } from "@/components/UpgradeAccount";

interface ShippingInfo {
  fullName: string;
  phone: string;
  address: string;
  city: string;
}

interface BankInfo {
  bankName: string;
  accountNo: string;
  accountName: string;
}

interface BasicInfo {
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string;
}

const getInitials = (name: string | null): string => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function ProfilePage() {
  const { user, fetchUserData } = useUser();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    username: "",
    email: "",
    fullName: "",
    avatarUrl: "",
  });
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    fullName: "",
    phone: "",
    address: "",
    city: "",
  });
  const [bankInfo, setBankInfo] = useState<BankInfo>({
    bankName: "",
    accountNo: "",
    accountName: "",
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passLoading, setPassLoading] = useState(false);

  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // === STATE MỚI CHO TÌM KIẾM ===
  const [searchTerm, setSearchTerm] = useState("");
  // ==============================

  useEffect(() => {
    if (user) {
      setBasicInfo({
        username: user.username || "",
        email: user.email || "",
        fullName: user.full_name || "",
        avatarUrl: user.avatar_url || "",
      });
      if (user.shipping_info) setShippingInfo(user.shipping_info);
      if (user.bank_info) setBankInfo(user.bank_info);
      fetchUserProducts();
    }
  }, [user]);

  const fetchUserProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/profile/products");
      const data = await res.json();

      if (res.ok && data.products) {
        setUserProducts(data.products);
      } else {
        console.error("Lỗi tải sản phẩm:", data.error);
        setUserProducts([]);
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh quá lớn (Tối đa 5MB)");
      return;
    }

    setUploading(true);
    try {
      const uploadedUrl = await uploadFileViaApi("avatars", file);
      if (uploadedUrl) {
        setBasicInfo((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
      }
    } catch (error: any) {
      alert("Lỗi tải ảnh lên: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const payload = {
        username: basicInfo.username,
        email: basicInfo.email,
        full_name: basicInfo.fullName,
        avatar_url: basicInfo.avatarUrl,
        shipping_info: shippingInfo,
        bank_info: {
          ...bankInfo,
          accountName: bankInfo.accountName.toUpperCase(),
        },
      };

      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật");

      alert("Đã lưu thông tin thành công!");
      if (fetchUserData) await fetchUserData();
    } catch (error: any) {
      alert(error.message || "Lỗi khi lưu hồ sơ.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (passwords.new.length < 6) {
      alert("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    setPassLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Đổi mật khẩu thất bại");

      alert("Đổi mật khẩu thành công!");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      alert(error.message || "Lỗi đổi mật khẩu.");
    } finally {
      setPassLoading(false);
    }
  };

  // === LOGIC LỌC SẢN PHẨM ===
  // 1. Chỉ lấy status 'available' hoặc 'auction' (nếu muốn hiện đấu giá đang chạy)
  // 2. Lọc theo từ khóa tìm kiếm
  const displayedProducts = userProducts.filter((prod) => {
    const isAvailable = prod.status === "available"; // Yêu cầu của bạn: Chỉ available
    const matchesSearch = prod.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return isAvailable && matchesSearch;
  });
  // ==========================

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl px-4">
      <h1 className="text-3xl font-bold mb-6">Hồ sơ cá nhân</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT TRÁI */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border shadow-md overflow-hidden text-center h-full">
            <div className="mt-8 mb-4 flex justify-center relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                <AvatarImage
                  src={basicInfo.avatarUrl || user.avatar_url || ""}
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl font-bold bg-muted text-muted-foreground">
                  {getInitials(basicInfo.fullName || user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="text-white h-8 w-8" />
              </div>
            </div>
            <CardContent className="pb-6 px-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-foreground">
                  {basicInfo.fullName || user.full_name || "Chưa đặt tên"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  @{basicInfo.username || user.username}
                </p>
              </div>
              <div className="flex justify-center items-center gap-2 mb-6 flex-wrap">
                {user.is_verified && (
                  <Badge className="bg-green-600 hover:bg-green-700 py-0.5 px-2 text-[10px] font-bold uppercase tracking-wider gap-1">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="border-yellow-500 text-yellow-700 bg-yellow-50 py-0.5 px-2 text-[11px]"
                >
                  Uy tín: {user.reputation_score}
                </Badge>
                {user.role === "dealer" && (
                  <Badge className="bg-purple-600 hover:bg-purple-700 py-0.5 px-2 text-[10px]">
                    Dealer
                  </Badge>
                )}
              </div>
              <Separator className="my-4" />
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                Đây là giao diện công khai của bạn trên sàn.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CỘT PHẢI */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4 h-12">
              <TabsTrigger value="general">
                <User className="w-4 h-4 md:mr-2" />{" "}
                <span className="hidden md:inline">Cơ bản</span>
              </TabsTrigger>
              <TabsTrigger value="shipping">
                <MapPin className="w-4 h-4 md:mr-2" />{" "}
                <span className="hidden md:inline">Giao hàng</span>
              </TabsTrigger>
              <TabsTrigger value="banking">
                <CreditCard className="w-4 h-4 md:mr-2" />{" "}
                <span className="hidden md:inline">Ngân hàng</span>
              </TabsTrigger>
              <TabsTrigger value="security">
                <KeyRound className="w-4 h-4 md:mr-2" />{" "}
                <span className="hidden md:inline">Bảo mật</span>
              </TabsTrigger>
              <TabsTrigger value="upgrade">
                <Gem className="w-4 h-4 md:mr-2" />{" "}
                <span className="hidden md:inline">Nâng cấp</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin tài khoản</CardTitle>
                  <CardDescription>
                    Quản lý tên hiển thị và thông tin đăng nhập.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14">
                      <Avatar className="h-14 w-14 border">
                        <AvatarImage
                          src={basicInfo.avatarUrl || ""}
                          className="object-cover"
                        />
                        <AvatarFallback>AV</AvatarFallback>
                      </Avatar>
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Loader2 className="animate-spin text-white h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <UploadCloud className="mr-2 h-4 w-4" /> Đổi ảnh đại
                        diện
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Tên hiển thị</Label>
                    <Input
                      value={basicInfo.fullName}
                      onChange={(e) =>
                        setBasicInfo({ ...basicInfo, fullName: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        value={basicInfo.username}
                        onChange={(e) =>
                          setBasicInfo({
                            ...basicInfo,
                            username: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={basicInfo.email}
                        onChange={(e) =>
                          setBasicInfo({ ...basicInfo, email: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/20 border-t py-4">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="ml-auto"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}{" "}
                    Lưu thay đổi
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="shipping">
              <Card>
                <CardHeader>
                  <CardTitle>Địa chỉ giao hàng</CardTitle>
                  <CardDescription>
                    Thông tin để người bán gửi hàng cho bạn.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Họ tên người nhận</Label>
                      <Input
                        value={shippingInfo.fullName}
                        onChange={(e) =>
                          setShippingInfo({
                            ...shippingInfo,
                            fullName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Số điện thoại</Label>
                      <Input
                        value={shippingInfo.phone}
                        onChange={(e) =>
                          setShippingInfo({
                            ...shippingInfo,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Địa chỉ chi tiết</Label>
                    <Input
                      value={shippingInfo.address}
                      onChange={(e) =>
                        setShippingInfo({
                          ...shippingInfo,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tỉnh / Thành phố</Label>
                    <Input
                      value={shippingInfo.city}
                      onChange={(e) =>
                        setShippingInfo({
                          ...shippingInfo,
                          city: e.target.value,
                        })
                      }
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/20 border-t py-4">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="ml-auto"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}{" "}
                    Lưu địa chỉ
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="banking">
              <Card>
                <CardHeader>
                  <CardTitle>Tài khoản nhận tiền</CardTitle>
                  <CardDescription>
                    Dùng để rút tiền từ Ví về tài khoản của bạn.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tên Ngân hàng</Label>
                    <Input
                      value={bankInfo.bankName}
                      onChange={(e) =>
                        setBankInfo({ ...bankInfo, bankName: e.target.value })
                      }
                      placeholder="VD: Vietcombank"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Số tài khoản</Label>
                      <Input
                        value={bankInfo.accountNo}
                        onChange={(e) =>
                          setBankInfo({
                            ...bankInfo,
                            accountNo: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Chủ tài khoản</Label>
                      <Input
                        value={bankInfo.accountName}
                        onChange={(e) =>
                          setBankInfo({
                            ...bankInfo,
                            accountName: e.target.value.toUpperCase(),
                          })
                        }
                        className="uppercase"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/20 border-t py-4">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="ml-auto"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}{" "}
                    Lưu ngân hàng
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Bảo mật tài khoản</CardTitle>
                  <CardDescription>
                    Đổi mật khẩu và khôi phục tài khoản.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Mật khẩu hiện tại</Label>
                      <Input
                        type="password"
                        value={passwords.current}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            current: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Mật khẩu mới</Label>
                        <Input
                          type="password"
                          value={passwords.new}
                          onChange={(e) =>
                            setPasswords({ ...passwords, new: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Xác nhận mật khẩu mới</Label>
                        <Input
                          type="password"
                          value={passwords.confirm}
                          onChange={(e) =>
                            setPasswords({
                              ...passwords,
                              confirm: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      className="text-muted-foreground text-sm"
                      onClick={() =>
                        alert("Tính năng Quên mật khẩu đang được phát triển.")
                      }
                    >
                      <HelpCircle className="mr-2 h-4 w-4" /> Quên mật khẩu?
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={passLoading}
                    >
                      {passLoading ? (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      ) : (
                        <KeyRound className="mr-2 h-4 w-4" />
                      )}{" "}
                      Đổi mật khẩu
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upgrade">
              <Card>
                <CardHeader>
                  <CardTitle>Hạng thành viên & Xác thực</CardTitle>
                  <CardDescription>
                    Nâng cấp tài khoản để nhận nhiều quyền lợi hơn.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <UpgradeAccount />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* === PHẦN SẢN PHẨM CỦA TÔI (ĐÃ SỬA) === */}
      <div className="mt-12">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Sản phẩm đang bán của
            tôi
          </h2>

          {/* THANH TÌM KIẾM */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm sản phẩm của bạn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loadingProducts ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : displayedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
            <p className="text-muted-foreground">
              {searchTerm
                ? "Không tìm thấy sản phẩm nào khớp."
                : "Bạn chưa có sản phẩm nào đang bán."}
            </p>
            <Button
              variant="link"
              onClick={() => (window.location.href = "/sell")}
            >
              Đăng bán ngay
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
