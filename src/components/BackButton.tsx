// src/components/BackButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      className="mb-6"
      onClick={() => router.back()} // Quay lại trang trước đó (lịch sử duyệt web)
    >
      <ArrowLeft className="mr-2 h-4 w-4" /> Back
    </Button>
  );
}
