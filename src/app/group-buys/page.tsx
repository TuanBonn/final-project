// src/app/group-buys/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Clock, PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/contexts/UserContext";

interface GroupBuyItem {
  id: string;
  name: string;
  image: string | null;
  price: number;
  target: number;
  current: number;
  deadline: string;
  host: { username: string; avatar_url: string | null };
  status: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

const getDaysLeft = (deadline: string) => {
  const diff = new Date(deadline).getTime() - new Date().getTime();
  if (diff < 0) return "Hết hạn";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} ngày`;
};

export default function GroupBuysPage() {
  const { user } = useUser();
  const [groupBuys, setGroupBuys] = useState<GroupBuyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/group-buys");
        const data = await res.json();
        setGroupBuys(data.groupBuys || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-orange-600" /> Săn Deal Mua Chung
          </h1>
          <p className="text-muted-foreground mt-1">
            Gom đơn giá sỉ, tiết kiệm chi phí ship.
          </p>
        </div>

        {user && (
          <Button asChild className="bg-orange-600 hover:bg-orange-700">
            <Link href="/group-buys/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Tạo kèo mới
            </Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
        </div>
      ) : groupBuys.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed">
          <p className="text-lg text-muted-foreground mb-4">
            Chưa có kèo nào đang mở.
          </p>
          {user && (
            <Button variant="outline" asChild>
              <Link href="/group-buys/create">Lên kèo ngay!</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {groupBuys.map((gb) => {
            return (
              <Card
                key={gb.id}
                className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow border-orange-100"
              >
                <div className="relative aspect-video bg-muted">
                  {gb.image ? (
                    <Image
                      src={gb.image}
                      alt={gb.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No Image
                    </div>
                  )}
                  {/* ĐÃ XÓA BADGE % ƯỚC TÍNH Ở ĐÂY */}
                </div>

                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={gb.host.avatar_url || ""} />
                      <AvatarFallback>H</AvatarFallback>
                    </Avatar>
                    <span>Host: {gb.host.username}</span>
                  </div>
                  <CardTitle className="text-base line-clamp-2 h-12 leading-snug">
                    <Link
                      href={`/group-buys/${gb.id}`}
                      className="hover:text-orange-600 transition-colors"
                    >
                      {gb.name}
                    </Link>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-0 flex-1">
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(gb.price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Giá / 1 sản phẩm
                    </p>
                  </div>

                  {/* ĐÃ SỬA LẠI PHẦN TIẾN ĐỘ (BỎ THANH PROGRESS) */}
                  <div className="flex items-center gap-2 text-sm font-medium bg-orange-50 text-orange-800 px-3 py-1.5 rounded-md w-fit">
                    <Users className="h-4 w-4" />
                    <span>
                      Tiến độ: {gb.current} / {gb.target}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" /> Còn lại:{" "}
                    <span className="font-medium text-foreground">
                      {getDaysLeft(gb.deadline)}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0">
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    asChild
                  >
                    <Link href={`/group-buys/${gb.id}`}>Tham gia ngay</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
