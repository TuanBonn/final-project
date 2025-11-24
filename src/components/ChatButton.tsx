// src/components/ChatButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

export function ChatButton({ sellerId }: { sellerId: string }) {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleChat = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.id === sellerId) {
      alert("Bạn không thể chat với chính mình.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: sellerId }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/messages?id=${data.conversationId}`);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleChat}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="mr-2 h-4 w-4" />
      )}
      Chat với người bán
    </Button>
  );
}
