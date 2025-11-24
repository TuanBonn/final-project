// src/components/ProductImageGallery.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function ProductImageGallery({
  images,
  productName,
}: {
  images: string[] | null;
  productName: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const imageList = images && images.length > 0 ? images : [];

  if (imageList.length === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted flex items-center justify-center text-muted-foreground">
        No Image
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ảnh lớn */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-white">
        <Image
          src={imageList[selectedIndex]}
          alt={productName}
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* List ảnh nhỏ */}
      {imageList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x scrollbar-hide">
          {imageList.map((url, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all snap-start",
                index === selectedIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-gray-300"
              )}
            >
              <Image
                src={url}
                alt={`Thumbnail ${index}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
