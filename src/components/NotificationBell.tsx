// src/components/NotificationBell.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@supabase/supabase-js";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

// Khởi tạo Supabase Client (để lắng nghe Realtime)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // 1. Lấy dữ liệu ban đầu khi load trang
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;

      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Err fetching notifs", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 2. Lắng nghe Realtime (Khi có thông báo mới -> Tự động cập nhật UI)
  useEffect(() => {
    if (!user) return;

    // Đăng ký kênh lắng nghe bảng 'notifications'
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT", // Chỉ quan tâm sự kiện thêm mới
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`, // Lọc đúng user này
        },
        (payload) => {
          const newNotif = payload.new as Notification;

          // Cập nhật State
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // (Tuỳ chọn) Phát âm thanh nhẹ
          // const audio = new Audio('/notification.mp3');
          // audio.play().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 3. Xử lý khi bấm vào thông báo (Đánh dấu đã đọc)
  const handleMarkAsRead = async (notif: Notification) => {
    // Đóng popup
    setIsOpen(false);

    if (notif.is_read) return;

    // Cập nhật UI ngay lập tức (Optimistic Update)
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Gọi API cập nhật trong background
    try {
      await fetch(`/api/notifications/${notif.id}`, { method: "PATCH" });
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse border-2 border-white dark:border-black" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b font-semibold bg-muted/10 flex justify-between items-center">
          <span>Thông báo</span>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} chưa đọc
            </span>
          )}
        </div>

        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground space-y-2">
              <Bell className="h-8 w-8 opacity-20" />
              <span className="text-sm">Không có thông báo mới.</span>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={notif.link || "#"}
                  onClick={() => handleMarkAsRead(notif)}
                  className={cn(
                    "p-4 border-b last:border-0 hover:bg-muted/50 transition-colors text-left relative group",
                    !notif.is_read ? "bg-blue-50/60 dark:bg-blue-900/10" : ""
                  )}
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <p
                      className={cn(
                        "text-sm font-semibold leading-snug",
                        !notif.is_read && "text-blue-700 dark:text-blue-400"
                      )}
                    >
                      {notif.title}
                    </p>
                    {!notif.is_read && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 text-right">
                    {new Date(notif.created_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
