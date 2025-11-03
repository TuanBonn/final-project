// src/components/FilterSidebar.tsx
"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BRAND_OPTIONS } from "@/lib/brands";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle } from "lucide-react";

// Props nhận từ page.tsx
interface FilterSidebarProps {
  sort: string;
  setSort: (value: string) => void;
  filterConditions: string[];
  setFilterConditions: (conditions: string[]) => void;
  filterBrands: string[];
  // === SỬA LỖI Ở DÒNG NÀY (BỎ CHỮ 'D') ===
  setFilterBrands: (brands: string[]) => void;
}

// Dữ liệu Tình trạng (giữ nguyên)
const ALL_CONDITIONS = [
  { id: "new", label: "Mới (New)" },
  { id: "used", label: "Đã sử dụng (Used)" },
  { id: "like_new", label: "Như mới (Like New)" },
  { id: "custom", label: "Hàng độ (Custom)" },
];

export function FilterSidebar({
  sort,
  setSort,
  filterConditions,
  setFilterConditions,
  filterBrands,
  setFilterBrands,
}: FilterSidebarProps) {
  // Hàm xử lý check/uncheck (cho mảng - giữ nguyên)
  const handleCheckedChange = (
    checked: boolean,
    value: string,
    currentValues: string[],
    setter: (values: string[]) => void
  ) => {
    if (checked) setter([...currentValues, value]);
    else setter(currentValues.filter((v) => v !== value));
  };

  return (
    <aside className="w-full lg:w-1/4 xl:w-1/5 space-y-6 p-4 border rounded-lg shadow-sm h-fit sticky top-24">
      {/* Sắp xếp (ĐÃ SỬA LẠI) */}
      <div>
        <h3 className="font-semibold mb-3 text-lg">Sắp xếp</h3>
        <RadioGroup value={sort} onValueChange={setSort}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="created_at_desc" id="sort-newest" />
            <Label htmlFor="sort-newest">Mới nhất</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="verified_first" id="sort-verified" />
            <Label
              htmlFor="sort-verified"
              className="flex items-center gap-1.5"
            >
              Ưu tiên Verified
              <CheckCircle className="h-4 w-4 text-green-600" />
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="price_asc" id="sort-price-asc" />
            <Label htmlFor="sort-price-asc">Giá: Thấp đến Cao</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="price_desc" id="sort-price-desc" />
            <Label htmlFor="sort-price-desc">Giá: Cao đến Thấp</Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      {/* Lọc chung (ĐÃ BỎ CHECKBOX VERIFIED) */}
      <div>
        <h3 className="font-semibold mb-3 text-lg">Lọc</h3>
        <p className="text-sm text-muted-foreground">
          (Chọn Tình trạng và Hãng xe bên dưới)
        </p>
      </div>

      <Separator />

      {/* Lọc theo Tình trạng (Giữ nguyên) */}
      <div>
        <h3 className="font-semibold mb-3">Tình trạng</h3>
        <div className="space-y-2">
          {ALL_CONDITIONS.map((cond) => (
            <div key={cond.id} className="flex items-center space-x-2">
              <Checkbox
                id={`cond-${cond.id}`}
                checked={filterConditions.includes(cond.id)}
                onCheckedChange={(checked) =>
                  handleCheckedChange(
                    checked === true,
                    cond.id,
                    filterConditions,
                    setFilterConditions
                  )
                }
              />
              <Label htmlFor={`cond-${cond.id}`}>{cond.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Lọc theo Hãng (Dùng "sớ" và ScrollArea) */}
      <div>
        <h3 className="font-semibold mb-3">Hãng xe</h3>
        <ScrollArea className="h-60 w-full rounded-md border p-4">
          <div className="space-y-2">
            {BRAND_OPTIONS.map((brand) => (
              <div key={brand.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`brand-${brand.value}`}
                  checked={filterBrands.includes(brand.value)}
                  onCheckedChange={(checked) =>
                    handleCheckedChange(
                      checked === true,
                      brand.value,
                      filterBrands,
                      setFilterBrands
                    )
                  }
                />
                <Label htmlFor={`brand-${brand.value}`}>{brand.label}</Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
