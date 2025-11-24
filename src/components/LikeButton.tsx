// src/components/forum/LikeButton.tsx
"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react"; // Hoặc dùng Heart nếu thích
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

interface LikeButtonProps {
  postId: string;
  initialLikeCount: number;
  initialIsLiked: boolean;
}

export function LikeButton({
  postId,
  initialLikeCount,
  initialIsLiked,
}: LikeButtonProps) {
  const { user } = useUser();
  const router = useRouter();

  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Ngăn chặn click vào Link bao ngoài (nếu có)
    e.stopPropagation();

    if (!user) {
      router.push("/login");
      return;
    }

    if (isLoading) return;

    // Optimistic Update (Cập nhật giao diện trước khi gọi API)
    const previousIsLiked = isLiked;
    const previousCount = likeCount;

    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/forum/posts/${postId}/like`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      // Cập nhật lại số chính xác từ server (để chắc chắn)
      setLikeCount(data.newLikeCount);
      setIsLiked(data.isLiked);
    } catch (error) {
      // Revert nếu lỗi
      setIsLiked(previousIsLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleLike}
      className={cn(
        "flex items-center gap-1 transition-colors hover:text-primary text-sm font-medium",
        isLiked ? "text-primary" : "text-muted-foreground"
      )}
      title={isLiked ? "Bỏ thích" : "Thích"}
    >
      <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
      <span>{likeCount}</span>
    </button>
  );
}
