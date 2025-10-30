// // src/app/profile/page.tsx
// "use client";

// import { useEffect, useState, useRef, useCallback } from "react";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Edit, Loader2, Upload } from "lucide-react";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogClose,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { useRouter } from "next/navigation";
// import { uploadFileViaApi } from "@/lib/storageUtils";

// // Kiểu dữ liệu Profile (phải khớp với API /api/profile/me trả về)
// interface UserProfile {
//   id: string;
//   email: string;
//   username: string | null;
//   full_name: string | null;
//   avatar_url: string | null;
//   role: string;
//   is_verified: boolean;
//   reputation_score: number;
//   created_at: string;
// }

// // --- Hàm lấy tên viết tắt (tách ra ngoài cho gọn) ---
// const getInitials = (name: string | null): string => {
//   if (!name) return "??";
//   return name
//     .split(" ")
//     .map((n) => n[0])
//     .join("")
//     .toUpperCase()
//     .slice(0, 2);
// };

// export default function ProfilePage() {
//   console.log(
//     "%c--- ProfilePage Render START ---",
//     "color: blue; font-weight: bold;"
//   ); // LOG 1: Bắt đầu render

//   const [profile, setProfile] = useState<UserProfile | null>(null);
//   const [loading, setLoading] = useState(true); // Khởi đầu là true
//   const [error, setError] = useState<string | null>(null);
//   const router = useRouter(); // Khai báo router nếu cần redirect

//   // State cho form edit
//   const [isSaving, setIsSaving] = useState(false);
//   const [editFullName, setEditFullName] = useState("");
//   const [editUsername, setEditUsername] = useState("");
//   const [editError, setEditError] = useState<string | null>(null);
//   const [isDialogOpen, setIsDialogOpen] = useState(false); // State quản lý Dialog

//   // State và Ref cho upload avatar
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   // --- Hàm fetch profile (Đã thêm log chi tiết) ---
//   const fetchProfile = useCallback(async () => {
//     setLoading(true); // Set loading true khi bắt đầu fetch
//     setError(null);
//     console.log("%cProfilePage: Fetching /api/profile/me...", "color: orange;"); // LOG 2
//     try {
//       const response = await fetch("/api/profile/me", {
//         cache: "no-store", // Không dùng cache
//         credentials: "include", // Gửi kèm cookie
//       });
//       console.log(`ProfilePage: Fetch status: ${response.status}`); // LOG 3

//       const responseText = await response.text(); // Đọc text trước
//       // Log một phần để tránh tràn console nếu response quá dài
//       // console.log("ProfilePage: Fetch response text (sample):", responseText.slice(0, 200) + '...'); // LOG 3.5 (Tùy chọn)

//       if (!response.ok) {
//         // Log lỗi cụ thể hơn
//         console.error(
//           `ProfilePage: Fetch failed! Status: ${response.status}, Body: ${responseText}`
//         ); // LOG 4: Lỗi fetch
//         let errorMsg = `Lỗi ${response.status}. Không thể tải profile.`;
//         try {
//           const errorData = JSON.parse(responseText);
//           errorMsg = errorData.error || errorMsg; // Lấy lỗi từ JSON nếu có
//         } catch (e) {
//           /* Bỏ qua nếu không phải JSON */
//         }
//         // Phân biệt 401 để xử lý riêng
//         if (response.status === 401) {
//           setError("Yêu cầu đăng nhập để xem trang này.");
//           console.log("ProfilePage: Received 401, redirecting..."); // LOG 401
//           router.push("/login?message=Session expired"); // Chuyển hướng về login
//         } else {
//           setError(errorMsg); // Các lỗi khác
//         }
//         setProfile(null); // Đảm bảo profile là null khi lỗi
//         return; // Dừng hàm khi lỗi
//       }

//       // Chỉ parse JSON khi response.ok
//       const data = JSON.parse(responseText);
//       console.log("%cProfilePage: API data received:", "color: green;", data); // LOG 5: Dữ liệu nhận được

//       if (data.profile) {
//         setProfile(data.profile); // Cập nhật state profile
//         // Cập nhật state form edit chỉ sau khi fetch thành công
//         setEditFullName(data.profile.full_name || "");
//         setEditUsername(data.profile.username || "");
//         console.log(
//           "%cProfilePage: Profile state UPDATED.",
//           "color: green; font-weight: bold;"
//         ); // LOG 6: State đã cập nhật
//       } else {
//         console.warn("ProfilePage: API returned OK but no profile data?"); // LOG Cảnh báo
//         setError("Không tìm thấy dữ liệu profile."); // Set lỗi nhẹ
//         setProfile(null); // Đảm bảo profile là null
//       }
//     } catch (err: unknown) {
//       console.error("ProfilePage: Exception during fetchProfile:", err); // LOG 7: Lỗi catch
//       setError(
//         err instanceof Error
//           ? err.message
//           : "Lỗi không xác định khi tải profile."
//       );
//       setProfile(null); // Đảm bảo profile là null khi có exception
//     } finally {
//       console.log("ProfilePage: Fetch finished, setLoading(false)."); // LOG 8: Kết thúc fetch
//       setLoading(false); // Luôn tắt loading
//     }
//   }, [router]); // Thêm router vì có dùng

//   useEffect(() => {
//     fetchProfile();
//   }, [fetchProfile]);

//   // --- Xử lý chọn file ---
//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file) {
//       if (file.size > 5 * 1024 * 1024) {
//         /* Check size */
//         setEditError("Ảnh quá bự (tối đa 5MB thôi).");
//         setSelectedFile(null);
//         setPreviewUrl(null);
//         if (fileInputRef.current) fileInputRef.current.value = "";
//         return;
//       }
//       setSelectedFile(file);
//       setEditError(null);
//       const reader = new FileReader();
//       reader.onloadend = () => setPreviewUrl(reader.result as string);
//       reader.readAsDataURL(file);
//     } else {
//       setSelectedFile(null);
//       setPreviewUrl(null);
//     }
//   };

//   // --- Xử lý submit edit form ---
//   const handleEditSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!profile) return;
//     setIsSaving(true);
//     setEditError(null);
//     let uploadedAvatarUrl: string | null = null;

//     try {
//       // Bước 1: Upload avatar QUA API nếu có file mới
//       if (selectedFile) {
//         uploadedAvatarUrl = await uploadFileViaApi("avatars", selectedFile);
//       }

//       // Bước 2: Chuẩn bị payload
//       const updatePayload: {
//         fullName?: string;
//         username?: string;
//         avatarUrl?: string;
//       } = {};
//       const currentFullName = profile?.full_name || "";
//       const currentUsername = profile?.username || "";
//       if (editFullName.trim() !== "" && editFullName.trim() !== currentFullName)
//         updatePayload.fullName = editFullName.trim();
//       if (editUsername.trim() !== currentUsername)
//         updatePayload.username = editUsername.trim();
//       if (uploadedAvatarUrl) updatePayload.avatarUrl = uploadedAvatarUrl;

//       // Bước 3: Gọi API PATCH nếu có thay đổi
//       if (Object.keys(updatePayload).length === 0) {
//         setIsSaving(false);
//         setIsDialogOpen(false);
//         /* ... reset file ... */ return;
//       }
//       const response = await fetch("/api/profile/me", {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(updatePayload),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || "Update failed.");

//       // Bước 4: Xử lý thành công
//       setProfile(data.profile);
//       setIsDialogOpen(false);
//       setSelectedFile(null);
//       setPreviewUrl(null);
//       if (fileInputRef.current) fileInputRef.current.value = "";
//     } catch (err: unknown) {
//       setEditError(err instanceof Error ? err.message : "Update error.");
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   // --- Reset form khi đóng Dialog ---
//   const handleDialogClose = (open: boolean) => {
//     setIsDialogOpen(open);
//     if (!open) {
//       /* Reset state về trạng thái profile hiện tại */
//       setEditFullName(profile?.full_name || "");
//       setEditUsername(profile?.username || "");
//       setSelectedFile(null);
//       setPreviewUrl(null);
//       setEditError(null);
//       setIsSaving(false);
//       if (fileInputRef.current) fileInputRef.current.value = "";
//     }
//   };

//   // --- Render UI ---
//   console.log("ProfilePage: Checking render conditions...", {
//     loading,
//     error,
//     profileIsNull: profile === null,
//   }); // LOG 9: Điều kiện render

//   if (loading) {
//     console.log("ProfilePage: Rendering LOADING..."); // LOG 10
//     return (
//       <div className="text-center py-10">
//         <Loader2 className="animate-spin inline-block mr-2 h-6 w-6" /> Đang load
//         profile...
//       </div>
//     );
//   }
//   if (error) {
//     console.log("ProfilePage: Rendering ERROR:", error); // LOG 11
//     return (
//       <div className="text-center py-10 px-4">
//         <Card className="inline-block bg-red-100 border-red-400 p-4">
//           <p className="text-red-700 font-semibold">Toang:</p>
//           <p className="text-red-600">{error}</p>
//         </Card>
//       </div>
//     );
//   }
//   // Check lại !profile sau khi đã hết loading và không có error
//   if (!profile) {
//     console.log("ProfilePage: Rendering NO PROFILE (after checks)"); // LOG 12
//     // Có thể hiển thị một thông báo thân thiện hơn hoặc component trống
//     return (
//       <div className="text-center py-10 text-muted-foreground">
//         Không tìm thấy thông tin profile. Bạn đã đăng nhập chưa?
//       </div>
//     );
//   }

//   // Nếu qua được hết -> Phải render cái này
//   console.log(
//     "%cProfilePage: RENDERING PROFILE JSX!",
//     "color: green; font-weight: bold;"
//   ); // LOG 13

//   return (
//     <div className="space-y-8 max-w-3xl mx-auto p-4 md:p-0">
//       {/* --- Card hiển thị Profile --- */}
//       <Card className="overflow-hidden">
//         <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 bg-muted/30 p-6">
//           <div>
//             <CardTitle className="text-2xl font-bold">Hồ sơ của bạn</CardTitle>
//             <p className="text-sm text-muted-foreground pt-1">
//               Trung tâm vũ trụ diecast của riêng bạn.
//             </p>
//           </div>
//           {/* --- Nút Edit và Dialog --- */}
//           <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
//             <DialogTrigger asChild>
//               <Button variant="outline" size="sm" className="gap-1">
//                 {" "}
//                 <Edit className="h-4 w-4" /> <span>Sửa</span>{" "}
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="sm:max-w-[480px]">
//               <DialogHeader>
//                 {/* ĐÃ SỬA LỖI THIẾU DialogTitle */}
//                 <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
//                 <DialogDescription>
//                   {" "}
//                   Cập nhật xong thì Lưu nha.{" "}
//                 </DialogDescription>
//               </DialogHeader>
//               {/* --- Form Edit --- */}
//               <form onSubmit={handleEditSubmit} className="pt-4">
//                 <div className="grid gap-6">
//                   {/* Upload Avatar */}
//                   <div className="grid grid-cols-4 items-center gap-4">
//                     <Label
//                       htmlFor="edit-avatar"
//                       className="text-right whitespace-nowrap"
//                     >
//                       Ảnh mới
//                     </Label>
//                     <div className="col-span-3 flex items-center gap-4">
//                       <Avatar className="h-16 w-16 border">
//                         {" "}
//                         <AvatarImage
//                           src={previewUrl || profile.avatar_url || ""}
//                           alt="Xem trước"
//                         />{" "}
//                         <AvatarFallback>
//                           {getInitials(editFullName || profile.full_name)}
//                         </AvatarFallback>{" "}
//                       </Avatar>
//                       <Input
//                         id="edit-avatar"
//                         type="file"
//                         accept="image/png, image/jpeg, image/webp"
//                         onChange={handleFileChange}
//                         className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
//                         ref={fileInputRef}
//                       />
//                     </div>
//                   </div>
//                   {/* Họ tên */}
//                   <div className="grid grid-cols-4 items-center gap-4">
//                     {" "}
//                     <Label htmlFor="edit-fullname" className="text-right">
//                       Họ tên
//                     </Label>{" "}
//                     <Input
//                       id="edit-fullname"
//                       value={editFullName}
//                       onChange={(e) => setEditFullName(e.target.value)}
//                       className="col-span-3"
//                       required
//                     />{" "}
//                   </div>
//                   {/* Username */}
//                   <div className="grid grid-cols-4 items-center gap-4">
//                     {" "}
//                     <Label htmlFor="edit-username" className="text-right">
//                       Username
//                     </Label>{" "}
//                     <Input
//                       id="edit-username"
//                       value={editUsername}
//                       onChange={(e) => setEditUsername(e.target.value)}
//                       className="col-span-3"
//                       placeholder="min 3 ký tự"
//                     />{" "}
//                   </div>
//                   {/* Hiển thị lỗi API */}
//                   {editError && (
//                     <p className="col-span-4 text-red-600 text-sm text-center">
//                       {editError}
//                     </p>
//                   )}
//                 </div>
//                 <DialogFooter className="mt-6">
//                   {" "}
//                   <Button
//                     type="button"
//                     variant="ghost"
//                     onClick={() => handleDialogClose(false)}
//                   >
//                     Hủy
//                   </Button>{" "}
//                   <Button type="submit" disabled={isSaving}>
//                     {" "}
//                     {isSaving ? (
//                       <Loader2 className="animate-spin mr-2 h-4 w-4" />
//                     ) : null}{" "}
//                     Lưu thay đổi{" "}
//                   </Button>{" "}
//                 </DialogFooter>
//               </form>
//             </DialogContent>
//           </Dialog>
//         </CardHeader>
//         {/* --- Hiển thị thông tin Profile --- */}
//         <CardContent className="flex flex-col items-center sm:flex-row sm:items-start gap-6 p-6">
//           <Avatar className="h-28 w-28 border-2 shadow-sm">
//             {" "}
//             <AvatarImage
//               src={profile.avatar_url || ""}
//               alt={profile.username || "Avatar"}
//             />{" "}
//             <AvatarFallback className="text-4xl">
//               {" "}
//               {getInitials(profile.full_name || profile.username)}{" "}
//             </AvatarFallback>{" "}
//           </Avatar>
//           <div className="space-y-1 text-center sm:text-left pt-2">
//             <h2 className="text-2xl font-semibold">
//               {profile.full_name || (
//                 <span className="text-muted-foreground italic">
//                   Chưa đặt tên
//                 </span>
//               )}
//             </h2>
//             <p className="text-muted-foreground">
//               @
//               {profile.username || (
//                 <span className="italic">Chưa đặt username</span>
//               )}
//             </p>
//             <p className="text-sm text-muted-foreground">{profile.email}</p>
//             <div className="pt-2 flex flex-col sm:flex-row items-center sm:items-baseline gap-x-4 gap-y-1 text-sm">
//               {" "}
//               <p>
//                 Uy tín:{" "}
//                 <span className="font-bold text-lg">
//                   {profile.reputation_score}
//                 </span>
//               </p>{" "}
//               {profile.is_verified && (
//                 <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-inset ring-blue-200">
//                   {" "}
//                   Đã xác thực{" "}
//                 </span>
//               )}{" "}
//             </div>
//             <p className="text-xs text-muted-foreground pt-2">
//               Tham gia từ:{" "}
//               {new Date(profile.created_at).toLocaleDateString("vi-VN")}
//             </p>
//           </div>
//         </CardContent>
//       </Card>

//       {/* --- Khu vực Wall Posts --- */}
//       <Card>
//         {" "}
//         <CardHeader>
//           <CardTitle>Tường nhà bạn</CardTitle>
//         </CardHeader>{" "}
//         <CardContent>
//           <p className="text-muted-foreground italic">
//             Chỗ này để khoe ảnh xe nè... Sắp có nha!
//           </p>
//         </CardContent>{" "}
//       </Card>
//     </div>
//   );
// }

// src/app/profile/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Loader2, Upload } from "lucide-react";
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
import { useRouter } from "next/navigation"; // <-- ĐÃ THÊM IMPORT THIẾU
import { uploadFileViaApi } from "@/lib/storageUtils";
import { useUser } from "@/contexts/UserContext"; // <-- DÙNG HOOK TỪ CONTEXT

// Kiểu dữ liệu Profile (phải khớp với API /api/profile/me trả về)
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

export default function ProfilePage() {
  // console.log("--- ProfilePage Component Render START ---"); // Log debug

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); // <-- Đã sửa lỗi useRouter

  // Lấy hàm fetchUserData từ Context
  const { fetchUserData: refetchUserContext } = useUser();

  // State cho form edit
  const [isSaving, setIsSaving] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false); // State quản lý Dialog

  // State và Ref cho upload avatar
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Hàm lấy tên viết tắt ---
  const getInitials = useCallback((name: string | null): string => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  // --- Hàm fetch profile (Đã thêm log chi tiết) ---
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    // console.log("ProfilePage: Bắt đầu fetch /api/profile/me");
    try {
      const response = await fetch("/api/profile/me", {
        cache: "no-store", // Không dùng cache
        credentials: "include", // Gửi kèm cookie
      });
      // console.log(`ProfilePage: Fetch status: ${response.status}`);

      const responseText = await response.text();
      // console.log("ProfilePage: Fetch response text:", responseText.slice(0, 200) + '...');

      if (!response.ok) {
        // Xử lý lỗi 401 Unauthorized
        if (response.status === 401) {
          setError("Yêu cầu đăng nhập để xem trang này.");
          router.push("/login?message=Session expired"); // Chuyển hướng về login
        } else {
          let errorMsg = `Lỗi ${response.status}. Không thể tải profile.`;
          try {
            const errorData = JSON.parse(responseText);
            errorMsg = errorData.error || errorMsg;
          } catch (e) {}
          setError(errorMsg); // Các lỗi khác
        }
        setProfile(null); // Đảm bảo profile là null khi lỗi
        return; // Dừng hàm khi lỗi
      }

      // Parse JSON
      const data = JSON.parse(responseText);
      // console.log("ProfilePage: API data received:", data);

      if (data.profile) {
        setProfile(data.profile); // Cập nhật state profile
        // Cập nhật state form edit chỉ sau khi fetch thành công
        setEditFullName(data.profile.full_name || "");
        setEditUsername(data.profile.username || "");
      } else {
        console.warn("ProfilePage: API returned OK but no profile data?");
        setError("Không tìm thấy dữ liệu profile.");
        setProfile(null);
      }
    } catch (err: unknown) {
      console.error("ProfilePage: Exception during fetchProfile:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Lỗi không xác định khi tải profile."
      );
      setProfile(null);
    } finally {
      // console.log("ProfilePage: Fetch finished, setting loading to false.");
      setLoading(false); // Luôn tắt loading
    }
  }, [router]); // Thêm router vì có dùng

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // --- Xử lý chọn file ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        /* Check size */
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

  // --- Xử lý submit edit form (Gọi Context refetch khi thành công) ---
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setEditError(null);
    let uploadedAvatarUrl: string | null = null;

    try {
      // Bước 1: Upload avatar QUA API nếu có file mới
      if (selectedFile) {
        uploadedAvatarUrl = await uploadFileViaApi("avatars", selectedFile);
      }

      // Bước 2: Chuẩn bị payload
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

      // Bước 3: Gọi API PATCH nếu có thay đổi
      if (Object.keys(updatePayload).length === 0) {
        /* ... xử lý không đổi ... */ return;
      }
      const response = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Update failed.");

      // Bước 4: Xử lý thành công
      setProfile(data.profile); // Cập nhật state local
      setIsDialogOpen(false); // Đóng Dialog
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // === BÁO CÁO TỔNG ĐÀI ĐỂ HEADER CẬP NHẬT ẢNH/TÊN MỚI ===
      console.log(
        "ProfilePage: Update successful, triggering context refetch..."
      );
      await refetchUserContext(); // <-- BÁO CÁO (Header sẽ tự update)
      // ===========================================
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Update error.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Reset form khi đóng Dialog ---
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

  // --- Render UI ---
  // console.log("ProfilePage: Checking render conditions...", { loading, error, profileIsNull: profile === null }); // Log debug

  if (loading) {
    // console.log("ProfilePage: Rendering LOADING state");
    return (
      <div className="text-center py-10">
        <Loader2 className="animate-spin inline-block mr-2 h-6 w-6" /> Đang load
        profile...
      </div>
    );
  }
  if (error) {
    // console.log("ProfilePage: Rendering ERROR state:", error);
    // Khi lỗi, có thể trả về lỗi hoặc component login (nếu là 401)
    return (
      <div className="text-center py-10 px-4">
        <Card className="inline-block bg-red-100 border-red-400 p-4">
          <p className="text-red-700 font-semibold">Error:</p>
          <p className="text-red-600">{error}</p>
        </Card>
      </div>
    );
  }
  if (!profile) {
    // console.log("ProfilePage: Rendering NO PROFILE state");
    // Dù không lỗi, nhưng không có profile (đã bị redirect)
    return (
      <div className="text-center py-10 text-muted-foreground">
        Không tìm thấy thông tin profile.
      </div>
    );
  }

  // console.log("ProfilePage: RENDERING PROFILE JSX!");

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
          {/* --- Nút Edit và Dialog --- */}
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                {" "}
                <Edit className="h-4 w-4" /> <span>Sửa</span>{" "}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                {" "}
                <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>{" "}
                <DialogDescription>
                  {" "}
                  Cập nhật xong thì Lưu nha.{" "}
                </DialogDescription>{" "}
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

      {/* --- Khu vực Wall Posts --- */}
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
