// src/app/admin/posts/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Search,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Eye, // <-- Import icon Eye
} from "lucide-react";
import { Button } from "@/components/ui/button"; // <-- Import Button
import { PostActions } from "@/components/admin/PostActions";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"; // <-- Import Dialog components

interface PostRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author: { username: string | null; full_name?: string | null } | null;
  like_count: number;
  comment_count: number;
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State cho Dialog xem chi tiết
  const [selectedPost, setSelectedPost] = useState<PostRow | null>(null);

  // Fetch Function
  const fetchPosts = useCallback(async (searchTerm = "", isInitial = false) => {
    if (isInitial) setLoading(true);
    else setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/admin/posts?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load posts");
      }

      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err: any) {
      console.error("Admin Posts Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, []);

  // 1. Initial Load
  useEffect(() => {
    fetchPosts("", true);
  }, [fetchPosts]);

  // 2. Debounced Search (Auto search after 500ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchPosts(search, false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [search, fetchPosts]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle>Forum Posts Management</CardTitle>
              <CardDescription>
                Moderate community discussions and questions.
              </CardDescription>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* THÊM max-w để giới hạn cột Content */}
                  <TableHead className="w-[300px] max-w-[300px]">
                    Content
                  </TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No posts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.map((post) => (
                    <TableRow key={post.id}>
                      {/* THÊM max-w để ép nội dung không tràn */}
                      <TableCell className="max-w-[300px]">
                        <div className="flex flex-col gap-1">
                          <span
                            className="font-semibold line-clamp-1 truncate"
                            title={post.title}
                          >
                            {post.title}
                          </span>
                          <span
                            className="text-sm text-muted-foreground line-clamp-2 break-words"
                            title={post.content}
                          >
                            {post.content}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            @{post.author?.username || "Unknown"}
                          </span>
                          <Badge
                            variant="secondary"
                            className="w-fit text-[10px] mt-1 h-5 px-1.5"
                          >
                            Member
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span
                            className="flex items-center gap-1"
                            title="Likes"
                          >
                            <ThumbsUp className="h-3 w-3" /> {post.like_count}
                          </span>
                          <span
                            className="flex items-center gap-1"
                            title="Comments"
                          >
                            <MessageSquare className="h-3 w-3" />{" "}
                            {post.comment_count}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(post.created_at).toLocaleDateString("en-US")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          {/* Nút View Details */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedPost(post)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>

                          <PostActions
                            post={post}
                            type="forum"
                            onActionSuccess={() => fetchPosts(search, false)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG XEM CHI TIẾT */}
      <Dialog
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedPost?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2 mt-2">
              <span>
                By{" "}
                <span className="font-semibold text-foreground">
                  @{selectedPost?.author?.username}
                </span>
              </span>
              <span>•</span>
              <span>
                {selectedPost?.created_at &&
                  new Date(selectedPost.created_at).toLocaleString("en-US")}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-base leading-relaxed whitespace-pre-line text-foreground/90">
              {selectedPost?.content}
            </p>
          </div>

          <div className="flex gap-6 border-t pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              <span className="font-medium text-foreground">
                {selectedPost?.like_count}
              </span>{" "}
              Likes
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium text-foreground">
                {selectedPost?.comment_count}
              </span>{" "}
              Comments
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPost(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
