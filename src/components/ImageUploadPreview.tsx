// src/components/ImageUploadPreview.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ImagePlus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ImageUploadPreviewProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}

export function ImageUploadPreview({
  onFilesChange,
  maxFiles = 5,
}: ImageUploadPreviewProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    let newFiles = Array.from(files);

    // Giới hạn số lượng
    if (selectedFiles.length + newFiles.length > maxFiles) {
      alert(`Bạn chỉ được chọn tối đa ${maxFiles} ảnh.`);
      newFiles = newFiles.slice(0, maxFiles - selectedFiles.length);
    }

    const validImageFiles = newFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    if (validImageFiles.length > 0) {
      const updatedFiles = [...selectedFiles, ...validImageFiles];
      setSelectedFiles(updatedFiles);
      onFilesChange(updatedFiles);

      // Tạo URL preview
      const newPreviews = validImageFiles.map((file) =>
        URL.createObjectURL(file)
      );
      setPreviewUrls((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    const updatedFiles = selectedFiles.filter(
      (_, index) => index !== indexToRemove
    );
    setSelectedFiles(updatedFiles);
    onFilesChange(updatedFiles);

    URL.revokeObjectURL(previewUrls[indexToRemove]);
    setPreviewUrls((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  return (
    <div className="space-y-4">
      {/* Khu vực hiển thị ảnh (Grid giống Admin) */}
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {previewUrls.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded-md overflow-hidden border group"
            >
              <Image
                src={url}
                alt={`Preview ${index}`}
                fill
                className="object-cover"
              />

              {/* Nút xóa (Hiện khi hover) */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>

              {index === 0 && (
                <Badge className="absolute bottom-1 left-1 bg-black/70 hover:bg-black/80 text-[10px] h-5">
                  Ảnh bìa
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Nút chọn ảnh */}
      {selectedFiles.length < maxFiles && (
        <div className="relative">
          <input
            type="file"
            id="image-upload-component"
            multiple
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={handleFileSelect}
            onClick={(e) => (e.currentTarget.value = "")}
          />
          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors text-muted-foreground">
            <ImagePlus className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">
              Bấm để chọn ảnh ({selectedFiles.length}/{maxFiles})
            </span>
            <span className="text-xs">JPG, PNG, WebP (Max 5MB)</span>
          </div>
        </div>
      )}
    </div>
  );
}
