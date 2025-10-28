// // src/app/profile/page.tsx
// "use client";

// import { useEffect, useState } from "react";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Edit } from "lucide-react"; // Icon chỉnh sửa

// // Định nghĩa kiểu dữ liệu cho Profile (nên tách ra file riêng sau này)
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
//   // Thêm các trường khác nếu cần
// }

// export default function ProfilePage() {
//   const [profile, setProfile] = useState<UserProfile | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchProfile = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const response = await fetch("/api/profile/me"); // Gọi API bạn vừa tạo

//         if (response.status === 401) {
//           // Xử lý trường hợp chưa đăng nhập (ví dụ: chuyển hướng về /login)
//           setError("Bạn cần đăng nhập để xem trang này.");
//           // Hoặc: router.push('/login'); (cần import useRouter)
//           return;
//         }
//         if (!response.ok) {
//           const data = await response.json();
//           throw new Error(data.error || "Không thể tải thông tin cá nhân.");
//         }

//         const data = await response.json();
//         setProfile(data.profile);
//       } catch (err: unknown) {
//         console.error("Lỗi fetch profile:", err);
//         setError(
//           err instanceof Error ? err.message : "Đã xảy ra lỗi không mong muốn."
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProfile();
//   }, []); // Chạy 1 lần khi component mount

//   // Xử lý trạng thái Loading
//   if (loading) {
//     return <div className="text-center py-10">Đang tải thông tin...</div>;
//   }

//   // Xử lý trạng thái Lỗi
//   if (error) {
//     return <div className="text-center py-10 text-red-600">Lỗi: {error}</div>;
//   }

//   // Xử lý trạng thái Không có Profile (dù đã đăng nhập?)
//   if (!profile) {
//     return (
//       <div className="text-center py-10">Không tìm thấy thông tin cá nhân.</div>
//     );
//   }

//   // Hiển thị thông tin Profile
//   return (
//     <div className="space-y-6">
//       <Card>
//         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//           <CardTitle className="text-2xl font-bold">Trang cá nhân</CardTitle>
//           <Button variant="outline" size="icon">
//             <Edit className="h-4 w-4" />
//             <span className="sr-only">Chỉnh sửa</span>
//           </Button>
//         </CardHeader>
//         <CardContent className="flex items-center space-x-6 pt-6">
//           <Avatar className="h-24 w-24 border">
//             <AvatarImage
//               src={profile.avatar_url || ""}
//               alt={profile.username || "Avatar"}
//             />
//             <AvatarFallback className="text-3xl">
//               {/* Hàm getInitials có thể copy từ UserAvatar.tsx */}
//               {profile.full_name
//                 ?.split(" ")
//                 .map((n) => n[0])
//                 .join("")
//                 .toUpperCase() || "?"}
//             </AvatarFallback>
//           </Avatar>
//           <div className="space-y-1">
//             <h2 className="text-xl font-semibold">
//               {profile.full_name || "Chưa có tên"}
//             </h2>
//             <p className="text-muted-foreground">
//               @{profile.username || "Chưa có username"}
//             </p>
//             <p className="text-sm text-muted-foreground">{profile.email}</p>
//             {/* Hiển thị thêm các thông tin khác */}
//             <p className="text-sm">Điểm uy tín: {profile.reputation_score}</p>
//             {profile.is_verified && (
//               <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
//                 Đã xác thực (Dealer)
//               </span>
//             )}
//           </div>
//         </CardContent>
//       </Card>

//       {/* Khu vực hiển thị Wall Posts sau này */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Bài đăng trên tường</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <p className="text-muted-foreground">
//             Chức năng đang được xây dựng...
//           </p>
//           {/* Đây là nơi bạn sẽ fetch và hiển thị wall_posts */}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// src/app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Loader2 } from "lucide-react"; // Loading spinner
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // To close the dialog programmatically
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation"; // For redirecting if not logged in

// Profile data structure
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); // Initialize router

  // State for the edit form inside the dialog
  const [isSaving, setIsSaving] = useState(false); // Changed name for clarity
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Control dialog visibility

  // Function to fetch the user's profile data
  const fetchProfile = async () => {
    // Reset states before fetching
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/profile/me"); // Call your GET API

      if (response.status === 401) {
        // Not logged in, redirect to login page
        router.push("/login?message=Please log in to view your profile.");
        return; // Stop execution
      }
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load profile.");
      }

      const data = await response.json();
      setProfile(data.profile);
      // Initialize edit form state with fetched data
      setEditFullName(data.profile?.full_name || "");
      setEditUsername(data.profile?.username || "");
    } catch (err: unknown) {
      console.error("Error fetching profile:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile when the component mounts
  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means run once on mount

  // Handle the submission of the edit form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); // Show loading spinner on button
    setEditError(null);

    // Prepare only the data that needs updating
    const updatePayload: { fullName?: string; username?: string } = {};
    // Only add if value is defined and different from current profile
    if (editFullName.trim() !== "" && editFullName !== profile?.full_name) {
      updatePayload.fullName = editFullName.trim();
    }
    // Handle username update, allowing it to be potentially empty/null based on API logic
    if (editUsername !== profile?.username) {
      updatePayload.username = editUsername.trim(); // API will validate length/uniqueness
    }

    // If nothing actually changed, just close the dialog
    if (Object.keys(updatePayload).length === 0) {
      console.log("No changes detected.");
      setIsSaving(false);
      setIsDialogOpen(false); // Close the dialog
      return;
    }

    try {
      const response = await fetch("/api/profile/me", {
        // Call your PATCH API
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        // If API returns an error (4xx, 5xx)
        throw new Error(data.error || "Update failed.");
      }

      // Success!
      // alert(data.message); // Optional: Show success message
      setProfile(data.profile); // Update the displayed profile with fresh data from API
      setIsDialogOpen(false); // Close the dialog
    } catch (err: unknown) {
      console.error("Error updating profile:", err);
      setEditError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setIsSaving(false); // Hide loading spinner
    }
  };

  // --- Render UI ---
  if (loading)
    return (
      <div className="text-center py-10">
        <Loader2 className="animate-spin inline-block mr-2 h-6 w-6" /> Loading
        Profile...
      </div>
    );
  if (error)
    return <div className="text-center py-10 text-red-600">Error: {error}</div>;
  if (!profile)
    return (
      <div className="text-center py-10 text-muted-foreground">
        Profile data not found.
      </div>
    );

  // Function to get initials for Avatar fallback
  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {" "}
      {/* Centered content */}
      {/* --- Profile Display Card --- */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Your Profile</CardTitle>
            <p className="text-sm text-muted-foreground pt-1">
              View and edit your personal information.
            </p>
          </div>
          {/* --- EDIT BUTTON & DIALOG TRIGGER --- */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            {" "}
            {/* Control dialog state */}
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit Profile</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogDescription>
                  Make changes to your full name and username here. Click save
                  when done.
                </DialogDescription>
              </DialogHeader>
              {/* --- EDIT FORM INSIDE DIALOG --- */}
              <form onSubmit={handleEditSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-fullname" className="text-right">
                      Full Name
                    </Label>
                    <Input
                      id="edit-fullname"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-username" className="text-right">
                      Username
                    </Label>
                    <Input
                      id="edit-username"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="col-span-3"
                      placeholder="min 3 chars"
                      // Basic client-side check, but server validates properly
                    />
                  </div>
                  {/* Display API errors here */}
                  {editError && (
                    <p className="col-span-4 text-red-600 text-sm text-center pt-2">
                      {editError}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  {/* Using DialogClose might simplify closing, but manual state control is fine */}
                  {/* <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose> */}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : null}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        {/* --- PROFILE INFO DISPLAY --- */}
        <CardContent className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 pt-6">
          <Avatar className="h-24 w-24 border">
            <AvatarImage
              src={profile.avatar_url || ""}
              alt={profile.username || "Avatar"}
            />
            <AvatarFallback className="text-3xl">
              {getInitials(profile.full_name || profile.username)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold">
              {profile.full_name || (
                <span className="text-muted-foreground italic">Not Set</span>
              )}
            </h2>
            <p className="text-muted-foreground">
              @{profile.username || <span className="italic">Not Set</span>}
            </p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <p className="text-sm pt-1">
              Reputation:{" "}
              <span className="font-medium">{profile.reputation_score}</span>
            </p>
            {profile.is_verified && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                Verified Dealer
              </span>
            )}
            <p className="text-xs text-muted-foreground pt-2">
              Joined: {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
      {/* --- WALL POSTS AREA (Placeholder) --- */}
      <Card>
        <CardHeader>
          <CardTitle>Wall Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is where your amazing diecast photos will go...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
