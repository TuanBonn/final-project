"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Send,
  User,
  MessageSquare,
  ArrowLeft,
  Search,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useSearchParams, useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Conversation {
  id: string;
  partner: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  last_message: {
    content: string;
    created_at: string;
  } | null;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// === Tách logic chính vào component con ===
function MessagesContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    Conversation[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const conversationIdFromUrl = searchParams.get("id");
    if (conversationIdFromUrl) {
      setActiveConvId(conversationIdFromUrl);
    }
  }, [searchParams]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        setFilteredConversations(data.conversations);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoadingConv(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter((conv) =>
      conv.partner.username?.toLowerCase().includes(query)
    );
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsg(true);
    try {
      const res = await fetch(`/api/chat/${convId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMsg(false);
      scrollToBottom();
    }
  }, []);

  useEffect(() => {
    if (!activeConvId) return;

    const channel = supabase
      .channel(`chat:${activeConvId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvId, fetchConversations]);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    }
  }, [activeConvId, fetchMessages, router]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeConvId || !user) return;

    const tempContent = newMessage;
    setNewMessage("");

    try {
      const res = await fetch(`/api/chat/${activeConvId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tempContent }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error("Failed to send");

      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
        fetchConversations();
      }
    } catch (error) {
      console.error("Send error:", error);
      alert("Failed to send message.");
      setNewMessage(tempContent);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    router.push(`/messages?id=${id}`);
  };

  const activePartner = conversations.find(
    (c) => c.id === activeConvId
  )?.partner;

  return (
    <div className="container mx-auto py-6 max-w-6xl h-[calc(100vh-100px)]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {/* SIDEBAR LIST */}
        <Card
          className={`md:col-span-1 flex flex-col h-full overflow-hidden ${
            activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          <CardHeader className="py-4 border-b bg-muted/20 space-y-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" /> Messages
            </CardTitle>

            {/* SEARCH BAR */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>

          <ScrollArea className="flex-1">
            <div className="flex flex-col p-2 gap-1">
              {loadingConv ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="animate-spin" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground p-4">
                  {searchQuery ? "No results found." : "No conversations yet."}
                </p>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      activeConvId === conv.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Avatar>
                      <AvatarImage
                        src={conv.partner.avatar_url || ""}
                        className="object-cover"
                      />
                      <AvatarFallback>
                        {conv.partner.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold text-sm truncate">
                        {conv.partner.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message?.content || "Start a conversation"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* MAIN CHAT BOX */}
        <Card
          className={`md:col-span-2 flex flex-col h-full overflow-hidden shadow-lg border-t-4 border-t-primary/20 ${
            !activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConvId ? (
            <>
              <div className="p-4 border-b flex items-center gap-3 bg-background shadow-sm z-10">
                {/* Back button on mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden mr-1"
                  onClick={() => {
                    setActiveConvId(null);
                    router.push("/messages");
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <Avatar className="h-10 w-10 border">
                  <AvatarImage
                    src={activePartner?.avatar_url || ""}
                    className="object-cover"
                  />
                  <AvatarFallback>
                    {activePartner?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">{activePartner?.username}</h3>
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <span className="h-2 w-2 bg-green-600 rounded-full animate-pulse"></span>
                    Online
                  </span>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-4"
                ref={scrollRef}
              >
                {loadingMsg ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10 opacity-60">
                    <p>Say &quot;Hi&quot; 👋</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            isMe
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                          }`}
                        >
                          {msg.content}
                          <p
                            className={`text-[10px] mt-1 text-right ${
                              isMe ? "text-blue-100" : "text-slate-400"
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-background border-t">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="bg-muted/30 p-6 rounded-full mb-4">
                <User className="h-12 w-12 opacity-50" />
              </div>
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">to start chatting with the seller</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// === Component chính export ra ngoài ===
export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
