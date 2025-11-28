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
    console.error("Error creating notification:", error);
    // Do not throw to avoid breaking the main flow
    // (e.g. an order should still succeed even if notification fails)
  }
}
