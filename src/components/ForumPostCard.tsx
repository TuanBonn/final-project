"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, CheckCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

import { LikeButton } from "./LikeButton";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: {
    username: string;
    fullName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export function ForumPostCard({ post }: { post: ForumPost }) {
  const getInitials = (name: string) =>
    name?.substring(0, 2).toUpperCase() || "U";

  const truncateContent = (text: string, length: number) => {
    if (!text) return "";
    return text.length > length ? text.substring(0, length) + "..." : text;
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-primary/20">
      <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-start gap-3 space-y-0">
        <Avatar className="h-10 w-10 cursor-pointer border">
          <AvatarImage src={post.author.avatarUrl || ""} />
          <AvatarFallback>{getInitials(post.author.username)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm truncate">
              {post.author.fullName || post.author.username}
            </span>
            {post.author.isVerified && (
              <CheckCircle className="h-3 w-3 text-green-600" />
            )}
            <span className="text-xs text-muted-foreground">
              • @{post.author.username}
            </span>
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
                locale: enUS,
              })}
            </span>
          </div>

          <Link href={`/forum/${post.id}`} className="group">
            <h3 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">
              {post.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {truncateContent(post.content, 150)}
            </p>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          {/* LIKE BUTTON */}
          <LikeButton
            postId={post.id}
            initialLikeCount={post.likeCount}
            initialIsLiked={post.isLiked}
          />

          <Link
            href={`/forum/${post.id}`}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{post.commentCount} comments</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
