// src/app/profile/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Loader2, Upload, KeyRound, ShieldCheck } from "lucide-react"; // Thêm icon
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { uploadFileViaApi } from "@/lib/storageUtils";
import { useUser } from "@/contexts/UserContext"; // Dùng Context Hook

// Kiểu dữ liệu Profile
interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_verified: boolean;
  reputation_score: number;
  created_at: string;
}

// --- Hàm lấy tên viết tắt ---
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
  // console.log("--- ProfilePage Render START ---");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Lấy hàm "phát loa" từ Context
  const { fetchUserData: refetchUserContext } = useUser();

  // State cho dialog SỬA PROFILE
  const [isSaving, setIsSaving] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // State và Ref cho UPLOAD AVATAR
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State cho dialog ĐỔI MẬT KHẨU
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- Hàm fetch profile ban đầu ---
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    // console.log("ProfilePage: Fetching /api/profile/me...");
    try {
      const response = await fetch("/api/profile/me", {
        cache: "no-store",
        credentials: "include",
      });
      // console.log(`ProfilePage: Fetch status: ${response.status}`);
      const responseText = await response.text();
      // console.log("ProfilePage: Fetch response text:", responseText.slice(0, 200) + '...');

      if (!response.ok) {
        if (response.status === 401) {
          setError("Yêu cầu đăng nhập.");
          router.push("/login?message=Session expired");
        } else {
          let errorMsg = `Lỗi ${response.status}.`;
          try {
            const errorData = JSON.parse(responseText);
            errorMsg = errorData.error || errorMsg;
          } catch (e) {}
          setError(errorMsg);
        }
        setProfile(null);
        return;
      }

      const data = JSON.parse(responseText);
      if (data.profile) {
        setProfile(data.profile);
        // Set state ban đầu cho form edit
        setEditFullName(data.profile.full_name || "");
        setEditUsername(data.profile.username || "");
      } else {
        setError("Không tìm thấy dữ liệu profile.");
        setProfile(null);
      }
    } catch (err: unknown) {
      console.error("ProfilePage: Exception during fetchProfile:", err);
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      setProfile(null);
    } finally {
      // console.log("ProfilePage: Fetch finished.");
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // --- Xử lý chọn file ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        /* Check size 5MB */
        setEditError("Ảnh quá bự (tối đa 5MB thôi).");
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
      setEditError(null);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  // --- Xử lý submit edit form ---
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setEditError(null);
    let uploadedAvatarUrl: string | null = null;

    try {
      // 1. Upload avatar QUA API nếu có
      if (selectedFile) {
        uploadedAvatarUrl = await uploadFileViaApi("avatars", selectedFile);
      }

      // 2. Chuẩn bị payload
      const updatePayload: {
        fullName?: string;
        username?: string;
        avatarUrl?: string;
      } = {};
      const currentFullName = profile?.full_name || "";
      const currentUsername = profile?.username || "";
      if (editFullName.trim() !== "" && editFullName.trim() !== currentFullName)
        updatePayload.fullName = editFullName.trim();
      if (editUsername.trim() !== currentUsername)
        updatePayload.username = editUsername.trim();
      if (uploadedAvatarUrl) updatePayload.avatarUrl = uploadedAvatarUrl;

      // 3. Gọi API PATCH (chỉ khi có gì đó thay đổi)
      if (Object.keys(updatePayload).length > 0) {
        const response = await fetch("/api/profile/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Update failed.");
        setProfile(data.profile); // Cập nhật state local
        console.log(
          "ProfilePage: Update successful, triggering context refetch..."
        );
        await refetchUserContext(); // <-- BÁO CÁO TỔNG ĐÀI
      } else {
        // console.log("ProfilePage: Không có gì thay đổi.");
      }

      // 4. Xử lý thành công
      setIsDialogOpen(false); // Đóng Dialog
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Update error.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Reset form SỬA PROFILE khi đóng Dialog ---
  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      /* Reset state về trạng thái profile hiện tại */
      setEditFullName(profile?.full_name || "");
      setEditUsername(profile?.username || "");
      setSelectedFile(null);
      setPreviewUrl(null);
      setEditError(null);
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // === HÀM MỚI: XỬ LÝ SUBMIT ĐỔI MẬT KHẨU ===
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);

    // 1. Kiểm tra mật khẩu mới
    if (newPassword.length < 6) {
      setChangePassError("Mật khẩu mới phải ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePassError("Mật khẩu mới không khớp.");
      return;
    }
    setIsChangingPass(true);

    try {
      // 2. Gọi API đổi mật khẩu
      const response = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đổi mật khẩu thất bại.");

      // 3. Thành công
      alert(data.message);
      setIsChangePassOpen(false); // Đóng dialog
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setChangePassError(
        err instanceof Error ? err.message : "Lỗi không xác định."
      );
    } finally {
      setIsChangingPass(false);
    }
  };

  // --- Reset form ĐỔI MẬT KHẨU khi đóng Dialog ---
  const handleChangePassDialogClose = (open: boolean) => {
    setIsChangePassOpen(open);
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangePassError(null);
      setIsChangingPass(false);
    }
  };

  // --- Render UI ---
  if (loading)
    return (
      <div className="text-center py-10">
        <Loader2 className="animate-spin inline-block mr-2 h-6 w-6" /> Đang
        tải...
      </div>
    );
  if (error)
    return (
      <div className="text-center py-10 px-4">
        <Card className="inline-block bg-red-100 border-red-400 p-4">
          <p className="text-red-700 font-semibold">Lỗi:</p>
          <p className="text-red-600">{error}</p>
        </Card>
      </div>
    );
  if (!profile)
    return (
      <div className="text-center py-10 text-muted-foreground">
        Không tìm thấy profile.
      </div>
    );

  return (
    <div className="space-y-8 max-w-3xl mx-auto p-4 md:p-0">
      {/* --- Card hiển thị Profile --- */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 bg-muted/30 p-6">
          <div>
            <CardTitle className="text-2xl font-bold">Hồ sơ của bạn</CardTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Trung tâm vũ trụ diecast của riêng bạn.
            </p>
          </div>
          {/* --- Nút Edit và Dialog Sửa Profile --- */}
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                {" "}
                <Edit className="h-4 w-4" /> <span>Sửa</span>{" "}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
                <DialogDescription>
                  {" "}
                  Cập nhật xong thì Lưu nha.{" "}
                </DialogDescription>
              </DialogHeader>
              {/* --- Form Edit --- */}
              <form onSubmit={handleEditSubmit} className="pt-4">
                <div className="grid gap-6">
                  {/* Upload Avatar */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor="edit-avatar"
                      className="text-right whitespace-nowrap"
                    >
                      Ảnh mới
                    </Label>
                    <div className="col-span-3 flex items-center gap-4">
                      <Avatar className="h-16 w-16 border">
                        {" "}
                        <AvatarImage
                          src={previewUrl || profile.avatar_url || ""}
                          alt="Xem trước"
                        />{" "}
                        <AvatarFallback>
                          {getInitials(editFullName || profile.full_name)}
                        </AvatarFallback>{" "}
                      </Avatar>
                      <Input
                        id="edit-avatar"
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleFileChange}
                        className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        ref={fileInputRef}
                      />
                    </div>
                  </div>
                  {/* Họ tên */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    {" "}
                    <Label htmlFor="edit-fullname" className="text-right">
                      Họ tên
                    </Label>{" "}
                    <Input
                      id="edit-fullname"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="col-span-3"
                      required
                    />{" "}
                  </div>
                  {/* Username */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    {" "}
                    <Label htmlFor="edit-username" className="text-right">
                      Username
                    </Label>{" "}
                    <Input
                      id="edit-username"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="col-span-3"
                      placeholder="min 3 ký tự"
                    />{" "}
                  </div>
                  {/* Hiển thị lỗi API */}
                  {editError && (
                    <p className="col-span-4 text-red-600 text-sm text-center">
                      {editError}
                    </p>
                  )}
                </div>
                <DialogFooter className="mt-6">
                  {" "}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleDialogClose(false)}
                  >
                    Hủy
                  </Button>{" "}
                  <Button type="submit" disabled={isSaving}>
                    {" "}
                    {isSaving ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : null}{" "}
                    Lưu thay đổi{" "}
                  </Button>{" "}
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        {/* --- Hiển thị thông tin Profile --- */}
        <CardContent className="flex flex-col items-center sm:flex-row sm:items-start gap-6 p-6">
          <Avatar className="h-28 w-28 border-2 shadow-sm">
            {" "}
            <AvatarImage
              src={profile.avatar_url || ""}
              alt={profile.username || "Avatar"}
            />{" "}
            <AvatarFallback className="text-4xl">
              {" "}
              {getInitials(profile.full_name || profile.username)}{" "}
            </AvatarFallback>{" "}
          </Avatar>
          <div className="space-y-1 text-center sm:text-left pt-2">
            <h2 className="text-2xl font-semibold">
              {profile.full_name || (
                <span className="text-muted-foreground italic">
                  Chưa đặt tên
                </span>
              )}
            </h2>
            <p className="text-muted-foreground">
              @
              {profile.username || (
                <span className="italic">Chưa đặt username</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="pt-2 flex flex-col sm:flex-row items-center sm:items-baseline gap-x-4 gap-y-1 text-sm">
              {" "}
              <p>
                Uy tín:{" "}
                <span className="font-bold text-lg">
                  {profile.reputation_score}
                </span>
              </p>{" "}
              {profile.is_verified && (
                <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-inset ring-blue-200">
                  {" "}
                  Đã xác thực{" "}
                </span>
              )}{" "}
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Tham gia từ:{" "}
              {new Date(profile.created_at).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* === CARD MỚI: BẢO MẬT & ĐỔI MẬT KHẨU === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Bảo mật & Đăng nhập
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Quản lý cài đặt bảo mật và đổi mật khẩu của bạn.
          </p>
          <Dialog
            open={isChangePassOpen}
            onOpenChange={handleChangePassDialogClose}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <KeyRound className="mr-2 h-4 w-4" />
                Đổi mật khẩu
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Đổi mật khẩu</DialogTitle>
                <DialogDescription>
                  Nhập mật khẩu cũ và mật khẩu mới của bạn.
                </DialogDescription>
              </DialogHeader>
              {/* --- Form đổi mật khẩu --- */}
              <form onSubmit={handleChangePasswordSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="currentPass" className="text-right">
                      Mật khẩu cũ
                    </Label>
                    <Input
                      id="currentPass"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newPass" className="text-right">
                      Mật khẩu mới
                    </Label>
                    <Input
                      id="newPass"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="col-span-3"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="confirmPass" className="text-right">
                      Xác nhận mới
                    </Label>
                    <Input
                      id="confirmPass"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="col-span-3"
                      required
                    />
                  </div>
                  {changePassError && (
                    <p className="col-span-4 text-red-600 text-sm text-center">
                      {changePassError}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleChangePassDialogClose(false)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={isChangingPass}>
                    {isChangingPass ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : null}
                    Xác nhận
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        {" "}
        <CardHeader>
          <CardTitle>Tường nhà bạn</CardTitle>
        </CardHeader>{" "}
        <CardContent>
          <p className="text-muted-foreground italic">
            Chỗ này để khoe ảnh xe nè... Sắp có nha!
          </p>
        </CardContent>{" "}
      </Card>
    </div>
  );
}
