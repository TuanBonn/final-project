// src/components/ReviewDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewDialogProps {
  transactionId: string;
  productName: string;
  onSuccess: () => void;
}

export function ReviewDialog({
  transactionId,
  productName,
  onSuccess,
}: ReviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, rating, comment }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi đánh giá");

      alert("Cảm ơn bạn đã đánh giá!");
      setIsOpen(false);
      onSuccess(); // Refresh lại danh sách
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Star className="h-4 w-4" /> Đánh giá
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Đánh giá sản phẩm</DialogTitle>
          <DialogDescription>
            Bạn thấy sản phẩm <strong>{productName}</strong> thế nào?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Chọn sao */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-8 w-8",
                    star <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  )}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm font-medium text-muted-foreground">
            {rating === 5
              ? "Tuyệt vời!"
              : rating === 4
              ? "Hài lòng"
              : rating === 3
              ? "Bình thường"
              : "Tệ"}
          </p>

          {/* Nhập nội dung */}
          <div className="space-y-2">
            <Label>Nhận xét của bạn</Label>
            <Textarea
              placeholder="Chia sẻ thêm về trải nghiệm của bạn..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Đóng
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gửi đánh giá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
