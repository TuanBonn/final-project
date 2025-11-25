// src/lib/notification.ts
import { SupabaseClient } from "@supabase/supabase-js";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: "order" | "wallet" | "auction" | "system" | "chat";
  link?: string;
}

export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
) {
  try {
    await supabase.from("notifications").insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link,
      is_read: false,
    });
  } catch (error) {
    console.error("Lỗi tạo thông báo:", error);
    // Không throw error để tránh làm hỏng luồng chính (ví dụ mua hàng xong thì vẫn phải báo thành công dù lỗi notif)
  }
}
