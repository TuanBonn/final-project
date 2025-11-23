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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  MessageSquare,
  ThumbsUp,
  Image as ImageIcon,
} from "lucide-react";
import { PostActions } from "@/components/admin/PostActions";
import { Badge } from "@/components/ui/badge";

interface PostRow {
  id: string;
  title?: string; // Forum có title
  content?: string; // Wall có caption (mapping vào content)
  image_urls?: string[]; // Wall có ảnh
  created_at: string;
  author: { username: string | null } | null;
  like_count: number;
  comment_count: number;
  type: "forum" | "wall";
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentTab, setCurrentTab] = useState("forum"); // 'forum' or 'wall'

  const fetchPosts = useCallback(async (tab: string, searchTerm = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);

      // Chọn API dựa trên tab
      const endpoint =
        tab === "forum" ? "/api/admin/posts" : "/api/admin/wall-posts";

      const res = await fetch(`${endpoint}?${params.toString()}`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch khi đổi tab
  useEffect(() => {
    setSearch(""); // Reset search khi đổi tab
    fetchPosts(currentTab);
  }, [currentTab, fetchPosts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts(currentTab, search);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quản lý Bài viết</CardTitle>
        <CardDescription>
          Kiểm duyệt nội dung Diễn đàn và Tường nhà.
        </CardDescription>
        <div className="pt-2">
          <form onSubmit={handleSearch} className="relative flex gap-2">
            <Input
              placeholder={`Tìm kiếm trong ${
                currentTab === "forum" ? "diễn đàn" : "tường"
              }...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="forum"
          onValueChange={(val) => setCurrentTab(val)}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="forum">Diễn đàn (Forum)</TabsTrigger>
            <TabsTrigger value="wall">Tường nhà (Wall)</TabsTrigger>
          </TabsList>
        </Tabs>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nội dung</TableHead>
              <TableHead>Tác giả</TableHead>
              <TableHead>Tương tác</TableHead>
              <TableHead>Ngày đăng</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 && !loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  Không tìm thấy bài viết nào.
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-[350px]">
                    <div className="flex flex-col gap-1">
                      {/* Nếu là Forum thì hiện Title đậm */}
                      {currentTab === "forum" && post.title && (
                        <span className="font-semibold truncate block">
                          {post.title}
                        </span>
                      )}

                      {/* Nội dung/Caption */}
                      <span className="text-sm text-muted-foreground line-clamp-2">
                        {post.content || "(Không có nội dung)"}
                      </span>

                      {/* Nếu là Wall và có ảnh */}
                      {currentTab === "wall" &&
                        post.image_urls &&
                        post.image_urls.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                            <ImageIcon className="h-3 w-3" /> Đính kèm{" "}
                            {post.image_urls.length} ảnh
                          </div>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        @{post.author?.username || "user"}
                      </span>
                      <Badge
                        variant="outline"
                        className="w-fit text-[10px] mt-1 h-5 px-1.5"
                      >
                        {currentTab === "forum" ? "Member" : "User"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> {post.like_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />{" "}
                        {post.comment_count}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(post.created_at).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <PostActions
                      post={post}
                      type={currentTab as "forum" | "wall"} // Truyền type xuống
                      onActionSuccess={() => fetchPosts(currentTab, search)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
