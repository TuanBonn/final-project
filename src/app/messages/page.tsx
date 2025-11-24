// src/app/messages/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  partner: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  lastMessage: string;
  updatedAt: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: { username: string; avatar_url: string | null };
}

export default function MessagesPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConvoId = searchParams.get("id");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(
    initialConvoId
  );
  const [messages, setMessages] = useState<Message[]>([]);

  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false); // Loading cho lần đầu
  const [inputMessage, setInputMessage] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Conversations (Danh sách bên trái)
  useEffect(() => {
    const fetchConvos = async () => {
      try {
        const res = await fetch("/api/chat/conversations");
        const data = await res.json();
        setConversations(data.conversations || []);
        if (!initialConvoId && data.conversations?.length > 0) {
          setActiveConvoId(data.conversations[0].id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingConvos(false);
      }
    };
    if (user) fetchConvos();
  }, [user, initialConvoId]);

  // 2. Fetch Messages (Nội dung bên phải)
  // Sử dụng useCallback để tái sử dụng hàm này cho cả lần đầu và polling
  const fetchMessages = useCallback(
    async (isBackgroundUpdate = false) => {
      if (!activeConvoId) return;

      // Chỉ hiện loading nếu KHÔNG phải là update ngầm
      if (!isBackgroundUpdate) setLoadingMessages(true);

      try {
        const res = await fetch(`/api/chat/${activeConvoId}`);
        const data = await res.json();
        setMessages(data.messages || []);

        // Chỉ cuộn xuống dưới cùng khi load lần đầu (để tránh đang đọc bị nhảy)
        if (!isBackgroundUpdate) {
          setTimeout(
            () => scrollRef.current?.scrollIntoView({ behavior: "smooth" }),
            100
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!isBackgroundUpdate) setLoadingMessages(false);
      }
    },
    [activeConvoId]
  );

  // Effect để gọi hàm fetchMessages
  useEffect(() => {
    if (!activeConvoId) return;

    // Gọi ngay lập tức (Hiện loading)
    fetchMessages(false);

    // Gọi định kỳ mỗi 5s (Chạy ngầm, KHÔNG hiện loading)
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeConvoId, fetchMessages]);

  // 3. Gửi tin nhắn
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || !activeConvoId) return;

    const tempMsg = inputMessage;
    setInputMessage("");

    try {
      const res = await fetch(`/api/chat/${activeConvoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tempMsg }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(
          () => scrollRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      }
    } catch (error) {
      console.error("Lỗi gửi tin:", error);
      setInputMessage(tempMsg);
    }
  };

  if (!user)
    return <div className="p-10 text-center">Vui lòng đăng nhập để chat.</div>;

  return (
    <div className="container mx-auto py-6 h-[calc(100vh-80px)] max-h-[800px]">
      <div className="grid grid-cols-1 md:grid-cols-3 h-full gap-6">
        {/* CỘT TRÁI: DANH SÁCH */}
        <Card className="col-span-1 flex flex-col h-full overflow-hidden border-r">
          <div className="p-4 border-b bg-muted/10">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Tin nhắn
            </h2>
          </div>
          <ScrollArea className="flex-1">
            {loadingConvos ? (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-muted-foreground p-4 text-sm">
                Chưa có cuộc trò chuyện nào.
              </p>
            ) : (
              <div className="flex flex-col">
                {conversations.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => setActiveConvoId(convo.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b last:border-0",
                      activeConvoId === convo.id &&
                        "bg-muted/80 hover:bg-muted/80"
                    )}
                  >
                    <Avatar>
                      <AvatarImage src={convo.partner.avatar_url || ""} />
                      <AvatarFallback>
                        {convo.partner.username
                          ? convo.partner.username[0].toUpperCase()
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {convo.partner.full_name || convo.partner.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {convo.lastMessage}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* CỘT PHẢI: KHUNG CHAT */}
        <Card className="col-span-1 md:col-span-2 flex flex-col h-full overflow-hidden">
          {activeConvoId ? (
            <>
              {/* Header chat */}
              <div className="p-4 border-b bg-muted/10 flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={
                      conversations.find((c) => c.id === activeConvoId)?.partner
                        .avatar_url || ""
                    }
                  />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
                <span className="font-bold">
                  {conversations.find((c) => c.id === activeConvoId)?.partner
                    .username || "Chat"}
                </span>
              </div>

              {/* Message List */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex justify-center p-10">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            isMe ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] px-4 py-2 rounded-lg text-sm",
                              isMe
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-muted rounded-bl-none"
                            )}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={scrollRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <form
                onSubmit={handleSend}
                className="p-4 border-t flex gap-2 bg-background"
              >
                <Input
                  placeholder="Nhập tin nhắn..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
              <p>Chọn một cuộc trò chuyện để bắt đầu</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
