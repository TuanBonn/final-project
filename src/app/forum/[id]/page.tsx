"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  Send,
  CheckCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { useUser } from "@/contexts/UserContext";
import { LikeButton } from "@/components/LikeButton";

interface PostDetail {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
  like_count: number;
  comment_count: number;
  isLiked: boolean;
}

interface CommentItem {
  id: string;
  content: string;
  created_at: string;
  author: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function ForumPostDetailPage() {
  const { id: postId } = useParams();
  const { user } = useUser();
  const router = useRouter();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const postRes = await fetch(`/api/forum/posts/${postId}`);
      if (!postRes.ok) throw new Error("Post not found");
      const postData = await postRes.json();
      setPost(postData.post);

      const commentsRes = await fetch(`/api/forum/posts/${postId}/comments`);
      const commentsData = await commentsRes.json();
      setComments(commentsData.comments || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) return;
    if (!user) return router.push("/login");

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentContent }),
      });

      if (!res.ok) throw new Error("Failed to submit comment");

      const data = await res.json();

      setComments((prev) => [...prev, data.comment]);
      setCommentContent("");
    } catch (error) {
      alert("Unable to submit comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) =>
    name?.substring(0, 2).toUpperCase() || "??";

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!post)
    return <div className="text-center py-20">Post does not exist.</div>;

  return (
    <div className="container mx-auto py-6 max-w-4xl px-4">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/forum">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to forum
        </Link>
      </Button>

      {/* MAIN POST */}
      <Card className="mb-8 border-l-4 border-l-primary shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={post.author.avatar_url || ""} />
              <AvatarFallback>
                {getInitials(post.author.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">
                  {post.author.full_name || post.author.username}
                </span>
                {post.author.is_verified && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                @{post.author.username} •{" "}
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                  locale: enUS,
                })}
              </p>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold leading-tight">
            {post.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-line leading-relaxed text-lg mb-4">
            {post.content}
          </p>

          {/* LIKE + COMMENT COUNT */}
          <div className="flex items-center gap-4 border-t pt-3">
            <LikeButton
              postId={post.id}
              initialLikeCount={post.like_count}
              initialIsLiked={post.isLiked}
            />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" /> {comments.length} comments
            </div>
          </div>
        </CardContent>
      </Card>

      {/* COMMENTS SECTION */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Comments ({comments.length})
        </h3>

        {/* Comment form */}
        <div className="flex gap-4">
          <Avatar className="h-10 w-10 hidden sm:block">
            <AvatarImage src={user?.avatar_url || ""} />
            <AvatarFallback>
              {user ? getInitials(user.username!) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder={
                user ? "Write your comment..." : "Sign in to write a comment"
              }
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              disabled={!user || isSubmitting}
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!user || isSubmitting || !commentContent.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Post comment
              </Button>
            </div>
          </div>
        </div>

        {/* Comment list */}
        <div className="space-y-4 mt-6">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No comments yet.
            </p>
          ) : (
            comments.map((cmt) => (
              <div
                key={cmt.id}
                className="flex gap-3 p-4 bg-muted/20 rounded-lg border"
              >
                <Avatar className="h-8 w-8 mt-1 border">
                  <AvatarImage src={cmt.author.avatar_url || ""} />
                  <AvatarFallback>
                    {getInitials(cmt.author.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">
                      {cmt.author.full_name || cmt.author.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(cmt.created_at), {
                        addSuffix: true,
                        locale: enUS,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {cmt.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
