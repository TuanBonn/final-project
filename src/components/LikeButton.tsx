// src/components/forum/LikeButton.tsx
"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";
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
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push("/login");
      return;
    }

    if (isLoading) return;

    // Optimistic update
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
      setLikeCount(data.newLikeCount);
      setIsLiked(data.isLiked);
    } catch (error) {
      // Revert on error
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
      title={isLiked ? "Unlike" : "Like"}
    >
      <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
      <span>{likeCount}</span>
    </button>
  );
}
